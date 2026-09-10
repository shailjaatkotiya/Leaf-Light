import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStudio } from '../state/useStudio'
import { StudioEnvironment } from './StudioEnvironment'
import { Model } from './Model'
import { AddedLights } from './AddedLights'
import { DevBridge } from './DevBridge'

/** Exposure is a renderer property, so it is written imperatively. */
function Exposure() {
  const gl = useThree((s) => s.gl)
  const exposure = useStudio((s) => s.exposure)
  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])
  return null
}

/**
 * Frames whatever model was just loaded. A pendant 400 mm across and a
 * building 40 m across should both arrive on screen at a sensible size, so the
 * camera distance is derived from the model's own bounding radius.
 */
function CameraRig({ controls }) {
  const camera = useThree((s) => s.camera)
  const stats = useStudio((s) => s.stats)
  const status = useStudio((s) => s.status)

  useEffect(() => {
    if (status !== 'ready') return
    const r = Math.max(stats.dia / 2, stats.drop / 2, 0.05)
    const d = r * 3.2
    camera.near = Math.max(d / 500, 0.001)
    camera.far = d * 60
    camera.position.set(d * 0.62, d * 0.12, d * 0.78)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.set(0, 0, 0)
      controls.current.minDistance = r * 0.6
      controls.current.maxDistance = d * 6
      controls.current.update()
    }
  }, [status, stats, camera, controls])

  return null
}

function Floor() {
  const show = useStudio((s) => s.showFloor)
  const stats = useStudio((s) => s.stats)
  const shadows = useStudio((s) => s.shadows)
  if (!show) return null
  const r = Math.max(stats.dia, stats.drop, 0.4) * 2.4
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -Math.max(stats.drop, 0.2) / 2 - 0.02, 0]} receiveShadow={shadows}>
      <circleGeometry args={[r, 64]} />
      <meshStandardMaterial color="#14130f" roughness={0.78} metalness={0.04} />
    </mesh>
  )
}

function Post() {
  const bloom = useStudio((s) => s.bloom)
  const threshold = useStudio((s) => s.bloomThreshold)
  if (bloom <= 0.001) return null
  return (
    <EffectComposer disableNormalPass multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloom * 2}
        luminanceThreshold={threshold}
        luminanceSmoothing={0.25}
      />
    </EffectComposer>
  )
}

export function Viewer() {
  const controls = useRef()
  const autoRotate = useStudio((s) => s.autoRotate)
  const shadows = useStudio((s) => s.shadows)

  return (
    <Canvas
      shadows={shadows ? { type: THREE.PCFSoftShadowMap } : false}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        // ACES + sRGB output is what makes an authored glTF read the way it
        // did in the DCC tool it came out of.
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: 34, position: [1.15, 0.2, 1.4], near: 0.01, far: 200 }}
    >
      <Exposure />
      <DevBridge />
      <CameraRig controls={controls} />
      <StudioEnvironment />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      <AddedLights />
      <Floor />
      <Post />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={0.7}
      />
    </Canvas>
  )
}
