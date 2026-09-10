import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStudio } from '../state/useStudio'
import { registry } from '../state/registry'

function makeHelper(type, light) {
  try {
    if (type === 'directional') return new THREE.DirectionalLightHelper(light, 0.2)
    if (type === 'spot') return new THREE.SpotLightHelper(light)
    if (type === 'point') return new THREE.PointLightHelper(light, 0.05)
    if (type === 'hemisphere') return new THREE.HemisphereLightHelper(light, 0.15)
  } catch { /* some helpers dislike lights with no parent yet */ }
  return null
}

/**
 * The bridge between the panel and the THREE.Light objects that came out of
 * the .glb. Those lights stay exactly where the artist parented them — inside
 * the leaves — so nothing here touches their transform; it only writes the
 * properties the panel exposes.
 */
export function ModelLightBindings() {
  const scene = useThree((s) => s.scene)
  const modelLights = useStudio((s) => s.modelLights)
  const lampScale = useStudio((s) => s.lampScale)
  const gizmos = useStudio((s) => s.gizmos)

  useEffect(() => {
    modelLights.forEach((l) => {
      const o = registry.get(l.id)
      if (!o) return

      o.visible = l.on && !l.removed
      // The master trim rides on top of each light's own value, so one slider
      // can dim the whole fixture without flattening the balance between lamps.
      o.intensity = l.intensity * lampScale
      o.color.set(l.color)
      if (o.groundColor && l.groundColor) o.groundColor.set(l.groundColor)
      if ('distance' in o) o.distance = l.distance
      if ('decay' in o) o.decay = l.decay
      if ('angle' in o) o.angle = l.angle
      if ('penumbra' in o) o.penumbra = l.penumbra
      if ('castShadow' in o && !o.isAmbientLight && !o.isRectAreaLight) {
        o.castShadow = !!l.castShadow
        if (o.shadow) {
          o.shadow.mapSize.set(1024, 1024)
          o.shadow.bias = -0.0015
          o.shadow.normalBias = 0.02
        }
      }
    })
  }, [modelLights, lampScale])

  /* Gizmos are built lazily and thrown away when switched off. */
  const helpers = useMemo(() => {
    if (!gizmos) return []
    return modelLights
      .map((l) => {
        const o = registry.get(l.id)
        if (!o) return null
        const h = makeHelper(l.type, o)
        return h ? { id: l.id, helper: h } : null
      })
      .filter(Boolean)
  }, [gizmos, modelLights])

  useEffect(() => {
    helpers.forEach(({ helper }) => scene.add(helper))
    return () => {
      helpers.forEach(({ helper }) => {
        scene.remove(helper)
        helper.dispose?.()
      })
    }
  }, [helpers, scene])

  useFrame(() => {
    helpers.forEach(({ id, helper }) => {
      const o = registry.get(id)
      helper.visible = !!o?.visible
      helper.update?.()
    })
  })

  return null
}
