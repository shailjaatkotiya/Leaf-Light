# GLB Light Studio

A React (Vite + react-three-fiber) viewer for `.glb` models that carry their own
lights — the lights inside the leaves of the `DFA-light` pendant, for instance.
It renders the file's materials and `KHR_lights_punctual` lights as authored,
lists every one of them, and lets you add lights of your own and tune each one
independently.

```bash
npm install
# put your model at public/DFA-light.glb  (see "The model" below)
npm run dev
```

---

## The model

The app loads **`/DFA-light.glb`** on start, so drop your file into `public/`
under that name. Nothing is committed — `public/*.glb` is git-ignored, which
matters here because the real `DFA-light.glb` is ~300 MB.

Any other model can be loaded at runtime:

- **Import GLB** in the panel, or
- drag a `.glb` / `.gltf` anywhere onto the page.

Draco-compressed geometry, KTX2/Basis textures and meshopt buffers all decode.
The decoders are copied out of `three` into `public/draco/` and `public/basis/`
by `npm install` (`scripts/copy-decoders.mjs`), so nothing is fetched from a CDN
at runtime.

---

## What "rendered correctly" means here

Three things decide whether an authored `.glb` looks the way it did in Blender:

**Colour pipeline.** The renderer runs ACES Filmic tone mapping into an sRGB
output buffer, with exposure exposed as a slider. glTF colour textures are sRGB
and normal/roughness maps are linear; `GLTFLoader` tags them and nothing here
overrides that. Textures get an anisotropy bump, which is the one thing the
loader cannot know for your GPU.

**Lights.** three.js has been physically correct since r155, so a
`KHR_lights_punctual` point light authored at 9.6 candela is used as 9.6
candela, and a `range` of 0 means inverse-square falloff with no cutoff —
exactly what the spec says. The lights keep the transforms the artist gave
them; they are inside the leaves because that is where they were parented, and
this app never moves them.

**Emissive surfaces.** A lamp globe is usually an emissive material rather than
a light. `KHR_materials_emissive_strength` is honoured, the authored
`emissiveIntensity` is remembered, and the **Emissive boost** slider *scales*
it — so the ratio the artist set between one glowing part and another survives.
**Unclamp emissive** lets those surfaces past the tone-map shoulder so the bloom
pass can catch them, which is what reads as "lit from within".

---

## The light panel

### Lights in the model

Every light found in the `.glb`, one card each:

| Control | Effect |
| --- | --- |
| Intensity | that light alone, on a scale that runs to 4× its authored value |
| Colour | its colour |
| ◐ | mute / unmute |
| × | take it out of the scene (restorable — it is not deleted) |
| more | reach, falloff, cone angle, softness, shadow casting |
| **Fixture output** | a master trim over every file light at once |

**All on / All off** mute in bulk. **File defaults** puts every light — and the
master trim — back exactly as exported.

The master trim multiplies each light's own value rather than replacing it, so
you can dim the whole fixture without flattening the balance between its lamps.

### Added lights

**Directional · Point · Spot · Rect area · Hemisphere · Ambient.**

Each added light gets the same card, plus placement (azimuth, elevation,
distance — it orbits the model, aimed at the origin) and the controls that
belong to its type: cone angle and softness for a spot, width and height for a
rect-area light, ground-bounce colour for a hemisphere. Intensity is per-light,
independent of everything else.

**Studio fill** adds a conventional key + sky pair. It goes up automatically
only when a model brings no lights of its own, so a self-lit fixture is never
double-lit.

### Render

Exposure · Glow (bloom) and its threshold · Emissive boost · Environment
strength · Shadows · Floor · Gizmos · Wireframe · Auto-spin.

Metals are lit almost entirely by the environment map, so the app builds a small
procedural studio environment (a gradient with two softbox blobs, through
PMREM). No HDRI download, no network, and brass renders as brass instead of
black.

---

## Layout

```
src/
  App.jsx                        shell, drag-and-drop, loading + error overlay
  main.jsx
  styles.css
  components/
    Viewer.jsx                   <Canvas>, camera framing, bloom, orbit
    Model.jsx                    loads the glb, feeds the store, material sync
    ModelLightBindings.jsx       panel state -> the THREE.Lights from the file
    AddedLights.jsx              user-added lights, declarative
    StudioEnvironment.jsx        procedural PMREM environment + backdrop
    ControlPanel.jsx             the panel
    LightCard.jsx                one light, file or added
    Slider.jsx
    DevBridge.jsx                window.__studio console hook
  state/
    useStudio.js                 zustand store (plain, serialisable light data)
    registry.js                  id -> THREE.Light side table
  lib/
    useGlbModel.js               GLTFLoader + Draco/KTX2/meshopt, scene inspection
    lightTypes.js                per-type defaults, classification, placement
```

The store holds only plain data so React re-renders stay cheap; the actual
`THREE.Light` instances read out of the file live in `state/registry.js` and are
written to imperatively. Lights you add are ordinary R3F elements rendered from
the store.

### Console hook

```js
__studio.lights()           // every THREE.Light in the scene, with live values
__studio.store.getState()   // the panel's state
__studio.three.scene        // the scene itself
```

---

## Notes

- `main.jsx` deliberately does not use `<React.StrictMode>`: Strict Mode
  double-invokes effects in development, which would fetch and parse the `.glb`
  twice — slow and memory-hungry on a 300 MB model.
- Point-light shadows need a cube shadow map each, so shadow casting is off by
  default on file lights and is opt-in per light.
- The camera frames itself from the model's bounding radius, so a 400 mm pendant
  and a 40 m building both arrive on screen at a sensible size.
