import { useEffect, useMemo, useRef } from 'react'
import { useHelper } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { useStudio } from '../state/useStudio'
import { sphericalPosition } from '../lib/lightTypes'

RectAreaLightUniformsLib.init()

const SHADOW = {
  mapSize: [1024, 1024],
  bias: -0.0015,
  normalBias: 0.02,
}

function DirLight({ l, gizmos }) {
  const ref = useRef()
  useHelper(gizmos && ref, THREE.DirectionalLightHelper, 0.25, '#f2d9a4')
  const pos = useMemo(() => sphericalPosition(l.az, l.el, l.dist), [l.az, l.el, l.dist])
  return (
    <directionalLight
      ref={ref}
      visible={l.on}
      position={pos}
      color={l.color}
      intensity={l.intensity}
      castShadow={l.castShadow}
      shadow-mapSize={SHADOW.mapSize}
      shadow-bias={SHADOW.bias}
      shadow-normalBias={SHADOW.normalBias}
      shadow-camera-near={0.2}
      shadow-camera-far={20}
      shadow-camera-left={-2}
      shadow-camera-right={2}
      shadow-camera-top={2}
      shadow-camera-bottom={-2}
    />
  )
}

function PointLight({ l, gizmos }) {
  const ref = useRef()
  useHelper(gizmos && ref, THREE.PointLightHelper, 0.08, '#f0c98a')
  const pos = useMemo(() => sphericalPosition(l.az, l.el, l.dist), [l.az, l.el, l.dist])
  return (
    <pointLight
      ref={ref}
      visible={l.on}
      position={pos}
      color={l.color}
      intensity={l.intensity}
      distance={l.distance}
      decay={l.decay}
      castShadow={l.castShadow}
      shadow-mapSize={SHADOW.mapSize}
      shadow-bias={SHADOW.bias}
      shadow-normalBias={SHADOW.normalBias}
    />
  )
}

function SpotLight({ l, gizmos }) {
  const ref = useRef()
  useHelper(gizmos && ref, THREE.SpotLightHelper, '#ffd9a8')
  const pos = useMemo(() => sphericalPosition(l.az, l.el, l.dist), [l.az, l.el, l.dist])
  // A SpotLight aims at light.target, which sits at the origin by default —
  // which is exactly where the model was centred on load.
  return (
    <spotLight
      ref={ref}
      visible={l.on}
      position={pos}
      color={l.color}
      intensity={l.intensity}
      distance={l.distance}
      decay={l.decay}
      angle={l.angle}
      penumbra={l.penumbra}
      castShadow={l.castShadow}
      shadow-mapSize={SHADOW.mapSize}
      shadow-bias={SHADOW.bias}
      shadow-normalBias={SHADOW.normalBias}
    />
  )
}

function AreaLight({ l, gizmos }) {
  const ref = useRef()
  useHelper(gizmos && ref, RectAreaLightHelper)
  const pos = useMemo(() => sphericalPosition(l.az, l.el, l.dist), [l.az, l.el, l.dist])
  useEffect(() => {
    ref.current?.lookAt(0, 0, 0)
  }, [pos])
  return (
    <rectAreaLight
      ref={ref}
      visible={l.on}
      position={pos}
      color={l.color}
      intensity={l.intensity}
      width={l.width}
      height={l.height}
    />
  )
}

function HemiLight({ l, gizmos }) {
  const ref = useRef()
  useHelper(gizmos && ref, THREE.HemisphereLightHelper, 0.18, '#bcd4ff')
  return (
    <hemisphereLight
      ref={ref}
      visible={l.on}
      color={l.color}
      groundColor={l.groundColor}
      intensity={l.intensity}
    />
  )
}

function AmbLight({ l }) {
  return <ambientLight visible={l.on} color={l.color} intensity={l.intensity} />
}

const BY_TYPE = {
  directional: DirLight,
  point: PointLight,
  spot: SpotLight,
  area: AreaLight,
  hemisphere: HemiLight,
  ambient: AmbLight,
}

/** Every light the user has added, rendered declaratively from the store. */
export function AddedLights() {
  const lights = useStudio((s) => s.addedLights)
  const gizmos = useStudio((s) => s.gizmos)
  return (
    <>
      {lights.map((l) => {
        const C = BY_TYPE[l.type]
        return C ? <C key={l.id} l={l} gizmos={gizmos} /> : null
      })}
    </>
  )
}
