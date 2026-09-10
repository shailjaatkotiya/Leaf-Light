import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useStudio } from '../state/useStudio'
import { registry } from '../state/registry'

/**
 * A small scripting hook, the way the original viewer exposed one: handy for
 * driving the studio from the browser console, and for automated checks.
 *
 *   __studio.lights()          -> every THREE.Light currently in the scene
 *   __studio.store.getState()  -> the panel's state
 */
export function DevBridge() {
  const { scene, gl, camera } = useThree()
  useEffect(() => {
    window.__studio = {
      three: { scene, gl, camera },
      store: useStudio,
      registry,
      lights: () => {
        const out = []
        scene.traverse((o) => {
          if (!o.isLight) return
          out.push({
            name: o.name,
            type: o.type,
            visible: o.visible,
            intensity: o.intensity,
            color: `#${o.color.getHexString()}`,
            distance: o.distance,
            decay: o.decay,
            angle: o.angle,
          })
        })
        return out
      },
    }
    return () => { delete window.__studio }
  }, [scene, gl, camera])
  return null
}
