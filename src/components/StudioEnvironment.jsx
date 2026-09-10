import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * A procedural studio environment.
 *
 * Metals in a glTF are lit almost entirely by the environment map, so a viewer
 * with no environment renders brass as flat black. Rather than fetch an HDRI
 * (which needs a network round-trip and a licence), this paints a small
 * equirectangular gradient with a couple of soft "softbox" blobs and runs it
 * through PMREM — enough to give specular surfaces something to reflect.
 */
export function StudioEnvironment({ background = true }) {
  const { gl, scene } = useThree()

  const { envMap, bgTexture } = useMemo(() => {
    // --- environment (what the model reflects) ---
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#efe6d8')
    g.addColorStop(0.34, '#8d8578')
    g.addColorStop(0.52, '#3a3833')
    g.addColorStop(1, '#141414')
    x.fillStyle = g
    x.fillRect(0, 0, 512, 256)
    x.fillStyle = 'rgba(255,242,220,.95)'
    x.beginPath(); x.ellipse(150, 52, 86, 40, 0, 0, Math.PI * 2); x.fill()
    x.fillStyle = 'rgba(255,214,160,.55)'
    x.beginPath(); x.ellipse(380, 88, 60, 30, 0, 0, Math.PI * 2); x.fill()
    x.fillStyle = 'rgba(120,150,190,.35)'
    x.beginPath(); x.ellipse(470, 150, 70, 44, 0, 0, Math.PI * 2); x.fill()

    const envSource = new THREE.CanvasTexture(c)
    envSource.mapping = THREE.EquirectangularReflectionMapping
    envSource.colorSpace = THREE.SRGBColorSpace

    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const envMap = pmrem.fromEquirectangular(envSource).texture
    envSource.dispose()
    pmrem.dispose()

    // --- backdrop (what you see behind the model) ---
    const b = document.createElement('canvas')
    b.width = 4
    b.height = 256
    const bx = b.getContext('2d')
    const bg = bx.createLinearGradient(0, 0, 0, 256)
    bg.addColorStop(0, '#1b1a16')
    bg.addColorStop(0.45, '#131210')
    bg.addColorStop(1, '#0a0a08')
    bx.fillStyle = bg
    bx.fillRect(0, 0, 4, 256)
    const bgTexture = new THREE.CanvasTexture(b)
    bgTexture.mapping = THREE.EquirectangularReflectionMapping
    bgTexture.colorSpace = THREE.SRGBColorSpace

    return { envMap, bgTexture }
  }, [gl])

  useEffect(() => {
    scene.environment = envMap
    scene.background = background ? bgTexture : null
    return () => {
      scene.environment = null
      scene.background = null
    }
  }, [scene, envMap, bgTexture, background])

  useEffect(() => () => { envMap.dispose(); bgTexture.dispose() }, [envMap, bgTexture])

  return null
}
