import * as THREE from 'three'

/** UI metadata + sane starting values for every light type the studio can add. */
export const LIGHT_TYPES = {
  directional: {
    label: 'Dir',
    name: 'Directional',
    tint: '#f2d9a4',
    // lux — three is physically correct since r155, so directional light is in lux
    defaults: { intensity: 2.0, color: '#ffe9cf', az: 42, el: 40, dist: 3.0, castShadow: true },
    maxIntensity: 20,
  },
  point: {
    label: 'Point',
    name: 'Point',
    tint: '#f0c98a',
    // candela
    defaults: { intensity: 12, color: '#ffd9ad', az: 40, el: 30, dist: 2.2, distance: 0, decay: 2, castShadow: false },
    maxIntensity: 200,
  },
  spot: {
    label: 'Spot',
    name: 'Spot',
    tint: '#ffd9a8',
    defaults: {
      intensity: 30, color: '#ffe4bd', az: 35, el: 45, dist: 3.0,
      distance: 0, decay: 2, angle: 0.42, penumbra: 0.45, castShadow: true,
    },
    maxIntensity: 400,
  },
  area: {
    label: 'Area',
    name: 'Rect area',
    tint: '#cfe0f5',
    defaults: { intensity: 6, color: '#dbe7f7', az: -50, el: 25, dist: 2.4, width: 1.2, height: 0.9 },
    maxIntensity: 60,
  },
  hemisphere: {
    label: 'Hemi',
    name: 'Hemisphere',
    tint: '#bcd4ff',
    defaults: { intensity: 0.6, color: '#bfd0e8', groundColor: '#3a2c1c' },
    maxIntensity: 6,
  },
  ambient: {
    label: 'Amb',
    name: 'Ambient',
    tint: '#e6ddc9',
    defaults: { intensity: 0.35, color: '#e8dcc4' },
    maxIntensity: 4,
  },
}

export const ADDABLE = ['directional', 'point', 'spot', 'area', 'hemisphere', 'ambient']

/** Classify a THREE.Light that arrived inside a .glb into one of our type keys. */
export function classifyLight(l) {
  if (l.isDirectionalLight) return 'directional'
  if (l.isSpotLight) return 'spot'
  if (l.isRectAreaLight) return 'area'
  if (l.isHemisphereLight) return 'hemisphere'
  if (l.isAmbientLight) return 'ambient'
  return 'point'
}

/** Spherical placement helper: azimuth/elevation in degrees around an aim point. */
export function sphericalPosition(az, el, dist, aim = [0, 0, 0]) {
  const a = THREE.MathUtils.degToRad(az)
  const e = THREE.MathUtils.degToRad(el)
  return [
    aim[0] + dist * Math.cos(e) * Math.sin(a),
    aim[1] + dist * Math.sin(e),
    aim[2] + dist * Math.cos(e) * Math.cos(a),
  ]
}
