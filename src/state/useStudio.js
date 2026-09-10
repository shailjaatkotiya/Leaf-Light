import { create } from 'zustand'
import { LIGHT_TYPES } from '../lib/lightTypes'
import { registry } from './registry'

let seq = 0
const nextId = (p) => `${p}${++seq}`

export const useStudio = create((set, get) => ({
  /* ---------------- model ---------------- */
  modelUrl: '/DFA-light.glb',   // dropped into public/ ; overridden by import/drop
  modelSource: null,           // ArrayBuffer when the user supplies a file
  modelName: 'DFA-light.glb',
  status: 'loading',           // loading | ready | error
  statusText: 'loading model…',
  stats: { dia: 0, drop: 0, tris: 0, meshes: 0, materials: 0 },

  loadUrl: (url, name) =>
    set({ modelUrl: url, modelSource: null, modelName: name || url.replace(/^\.?\//, ''),
          status: 'loading', statusText: 'loading model…' }),

  loadBuffer: (buffer, name) =>
    set({ modelSource: buffer, modelUrl: null, modelName: name,
          status: 'loading', statusText: `reading ${name}` }),

  setStatus: (status, statusText) => set({ status, statusText }),
  setStats: (stats) => set({ stats }),

  /* ---------------- lights that shipped inside the .glb ---------------- */
  /* Mirrored as plain data for the UI; the THREE.Light itself lives in registry. */
  modelLights: [],

  /**
   * Called once per load, with the lights discovered while traversing the glTF
   * scene. Their authored values become each light's "file default", so a
   * single click can always put the fixture back the way it was exported.
   */
  adoptModelLights: (found) => {
    registry.clear()
    const modelLights = found.map((f, i) => {
      const id = nextId('m')
      registry.set(id, f.object)
      const meta = LIGHT_TYPES[f.type]
      return {
        id,
        src: 'model',
        type: f.type,
        name: f.object.name || `${meta.name} ${i + 1}`,
        on: true,
        removed: false,
        // authored (file) values, kept immutable for "File defaults"
        file: {
          intensity: f.object.intensity,
          color: `#${f.object.color.getHexString()}`,
          distance: f.object.distance ?? 0,
          decay: f.object.decay ?? 2,
          angle: f.object.angle ?? 0.42,
          penumbra: f.object.penumbra ?? 0,
          groundColor: f.object.groundColor ? `#${f.object.groundColor.getHexString()}` : undefined,
        },
        // live, user-editable values
        intensity: f.object.intensity,
        color: `#${f.object.color.getHexString()}`,
        distance: f.object.distance ?? 0,
        decay: f.object.decay ?? 2,
        angle: f.object.angle ?? 0.42,
        penumbra: f.object.penumbra ?? 0,
        groundColor: f.object.groundColor ? `#${f.object.groundColor.getHexString()}` : undefined,
        castShadow: false,
      }
    })
    set({ modelLights })
  },

  updateModelLight: (id, patch) =>
    set((s) => ({ modelLights: s.modelLights.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  removeModelLight: (id) =>
    set((s) => ({ modelLights: s.modelLights.map((l) => (l.id === id ? { ...l, removed: true } : l)) })),

  restoreModelLight: (id) =>
    set((s) => ({ modelLights: s.modelLights.map((l) => (l.id === id ? { ...l, removed: false } : l)) })),

  setAllModelLights: (on) =>
    set((s) => ({ modelLights: s.modelLights.map((l) => ({ ...l, on })) })),

  /* "File defaults" means the fixture as exported — which includes clearing
     the master trim, not just each light's own value. */
  resetModelLights: () =>
    set((s) => ({
      lampScale: 1,
      modelLights: s.modelLights.map((l) => ({ ...l, ...l.file, on: true, removed: false })),
    })),

  /* ---------------- lights the user adds ---------------- */
  addedLights: [],

  addLight: (type) => {
    const meta = LIGHT_TYPES[type]
    if (!meta) return
    const n = get().addedLights.filter((l) => l.type === type).length + 1
    const light = {
      id: nextId('a'),
      src: 'added',
      type,
      name: `${meta.name} ${n}`,
      on: true,
      ...meta.defaults,
    }
    set((s) => ({ addedLights: [...s.addedLights, light] }))
    return light.id
  },

  updateAddedLight: (id, patch) =>
    set((s) => ({ addedLights: s.addedLights.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  removeAddedLight: (id) =>
    set((s) => ({ addedLights: s.addedLights.filter((l) => l.id !== id) })),

  clearAddedLights: () => set({ addedLights: [] }),

  studioFill: () => {
    const { addedLights } = get()
    const have = new Set(addedLights.map((l) => l.name))
    const extra = []
    if (!have.has('Key')) {
      extra.push({ id: nextId('a'), src: 'added', type: 'directional', name: 'Key', on: true,
        ...LIGHT_TYPES.directional.defaults, intensity: 2.2, az: 42, el: 44, dist: 3 })
    }
    if (!have.has('Sky')) {
      extra.push({ id: nextId('a'), src: 'added', type: 'hemisphere', name: 'Sky', on: true,
        ...LIGHT_TYPES.hemisphere.defaults, intensity: 0.5 })
    }
    if (extra.length) set({ addedLights: [...addedLights, ...extra] })
  },

  /* ---------------- render settings ---------------- */
  lampScale: 1,        // master trim over every light that came from the file
  exposure: 0.95,
  bloom: 0.55,
  bloomThreshold: 0.75,
  envIntensity: 1,
  emissiveBoost: 1,
  unclampEmissive: true, // emissive surfaces bypass tone mapping so they bloom
  autoRotate: false,
  gizmos: false,
  wireframe: false,
  showFloor: true,
  shadows: true,

  set: (patch) => set(patch),
}))
