import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { classifyLight } from './lightTypes'

/**
 * A GLTFLoader wired for everything a real production .glb may carry:
 * Draco-compressed geometry, KTX2/Basis textures and meshopt buffers.
 * Decoders are served from public/ (see scripts/copy-decoders.mjs), so this
 * works offline and behind a firewall.
 */
function makeLoader(gl) {
  const loader = new GLTFLoader()

  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  loader.setDRACOLoader(draco)

  const ktx2 = new KTX2Loader()
  ktx2.setTranscoderPath('/basis/')
  ktx2.detectSupport(gl)
  loader.setKTX2Loader(ktx2)

  loader.setMeshoptDecoder(MeshoptDecoder)
  return { loader, draco, ktx2 }
}

/**
 * Walk the loaded scene once and do the three things that decide whether a
 * .glb "looks right":
 *
 *  1. Textures. glTF colour maps are sRGB and GLTFLoader already tags them;
 *     what it cannot know is your GPU's anisotropy budget, so sharpen them.
 *  2. Emissive surfaces. The lamp globes and the light strips inside the
 *     leaves are emissive materials, not lights. Their authored
 *     emissiveIntensity (including KHR_materials_emissive_strength) is
 *     remembered so a global boost can scale it without destroying the ratio
 *     the artist set between one glowing part and another.
 *  3. Punctual lights. KHR_lights_punctual lights arrive as real THREE lights
 *     parented wherever the artist put them — inside the leaves, in this
 *     model. They are collected, not moved: their transform is part of the
 *     design.
 */
function inspect(scene) {
  const lights = []
  const materials = new Set()
  let tris = 0
  let meshes = 0

  scene.traverse((o) => {
    if (o.isLight) {
      lights.push({ object: o, type: classifyLight(o) })
      return
    }
    if (!o.isMesh) return
    meshes++
    o.castShadow = true
    o.receiveShadow = true

    const geo = o.geometry
    if (geo) {
      tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3
      if (!geo.attributes.normal) geo.computeVertexNormals()
    }

    const list = Array.isArray(o.material) ? o.material : [o.material]
    list.forEach((m) => {
      if (!m || materials.has(m)) return
      materials.add(m)

      // remember the authored look so UI controls scale it instead of replacing it
      m.userData.__authored = {
        emissiveIntensity: m.emissiveIntensity ?? 1,
        envMapIntensity: m.envMapIntensity ?? 1,
        side: m.side,
        toneMapped: m.toneMapped,
      }
      m.userData.__emissive =
        !!m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.001

      for (const key of ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap',
        'normalMap', 'aoMap', 'clearcoatMap', 'sheenColorMap', 'transmissionMap']) {
        if (m[key]) m[key].anisotropy = 8
      }
    })
  })

  return { lights, materials: Array.from(materials), tris: Math.round(tris), meshes }
}

/** Centre the model on the origin and report its footprint in millimetres. */
function frame(scene) {
  const box = new THREE.Box3().setFromObject(scene)
  const centre = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  scene.position.sub(centre)
  return { size, radius: Math.max(size.x, size.z) / 2 || 0.5 }
}

/**
 * Loads a .glb from a URL or from an ArrayBuffer (import / drag-and-drop) and
 * returns the prepared scene plus everything the UI needs to describe it.
 */
export function useGlbModel({ url, buffer, onStatus }) {
  const gl = useThree((s) => s.gl)
  const [result, setResult] = useState(null)
  const kit = useMemo(() => makeLoader(gl), [gl])

  useEffect(() => {
    let cancelled = false

    const finish = (gltf) => {
      if (cancelled) return
      const scene = gltf.scene || gltf.scenes[0]
      const info = inspect(scene)
      const { size, radius } = frame(scene)
      setResult({ scene, animations: gltf.animations, ...info, size, radius })
    }

    const fail = (err) => {
      if (cancelled) return
      console.error('[glb] load failed', err)
      onStatus?.('error', err?.message ? `could not read model — ${err.message}` : 'could not read model')
    }

    if (buffer) {
      kit.loader.parse(buffer, '', finish, fail)
    } else if (url) {
      kit.loader.load(
        url,
        finish,
        (e) => {
          if (e.lengthComputable && e.total) {
            onStatus?.('loading', `loading model… ${Math.round((e.loaded / e.total) * 100)}%`)
          } else if (e.loaded) {
            onStatus?.('loading', `loading model… ${(e.loaded / 1048576).toFixed(1)} MB`)
          }
        },
        fail,
      )
    }

    return () => { cancelled = true }
  }, [url, buffer, kit, onStatus])

  useEffect(() => () => { kit.draco.dispose(); kit.ktx2.dispose() }, [kit])

  return result
}
