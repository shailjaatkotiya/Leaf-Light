import { useCallback, useEffect, useRef } from 'react'
import { useStudio } from '../state/useStudio'
import { useGlbModel } from '../lib/useGlbModel'
import { ModelLightBindings } from './ModelLightBindings'

/**
 * Loads the .glb, hands its lights to the store, and keeps the material-level
 * render settings (emissive boost, environment strength, wireframe) in sync
 * with the panel — always as a multiplier over what the file authored, never
 * as a replacement for it.
 */
export function Model() {
  const url = useStudio((s) => s.modelUrl)
  const buffer = useStudio((s) => s.modelSource)
  const emissiveBoost = useStudio((s) => s.emissiveBoost)
  const envIntensity = useStudio((s) => s.envIntensity)
  const unclampEmissive = useStudio((s) => s.unclampEmissive)
  const wireframe = useStudio((s) => s.wireframe)

  const onStatus = useCallback((status, text) => {
    useStudio.getState().setStatus(status, text)
  }, [])

  const model = useGlbModel({ url, buffer, onStatus })
  const previous = useRef(null)

  /* A fresh model replaces the light rig read from the previous one. */
  useEffect(() => {
    if (!model) return
    const s = useStudio.getState()
    s.adoptModelLights(model.lights)
    s.setStats({
      dia: Math.max(model.size.x, model.size.z),
      drop: model.size.y,
      tris: model.tris,
      meshes: model.meshes,
      materials: model.materials.length,
    })
    s.setStatus('ready', '')

    // If the file brings no lights of its own, put up a stand-in studio pair so
    // the model is not simply invisible.
    if (model.lights.length === 0 && s.addedLights.length === 0) s.studioFill()
  }, [model])

  /* Free the GPU memory of the model we just replaced. */
  useEffect(() => {
    const prev = previous.current
    previous.current = model
    if (!prev || prev === model) return
    prev.scene.traverse((o) => {
      if (!o.isMesh) return
      o.geometry?.dispose()
      const list = Array.isArray(o.material) ? o.material : [o.material]
      list.forEach((m) => {
        if (!m) return
        Object.values(m).forEach((v) => {
          if (v && v.isTexture) v.dispose()
        })
        m.dispose()
      })
    })
  }, [model])

  useEffect(() => {
    if (!model) return
    model.materials.forEach((m) => {
      const a = m.userData.__authored
      if (!a) return
      if (m.userData.__emissive) {
        m.emissiveIntensity = a.emissiveIntensity * emissiveBoost
        // Emissive surfaces read as "lit from within" only if they are allowed
        // past the tone-map shoulder into the bloom pass.
        m.toneMapped = unclampEmissive ? false : a.toneMapped
      }
      if ('envMapIntensity' in m) m.envMapIntensity = a.envMapIntensity * envIntensity
      m.wireframe = wireframe
      m.needsUpdate = true
    })
  }, [model, emissiveBoost, envIntensity, unclampEmissive, wireframe])

  if (!model) return null

  return (
    <>
      <primitive object={model.scene} />
      <ModelLightBindings />
    </>
  )
}
