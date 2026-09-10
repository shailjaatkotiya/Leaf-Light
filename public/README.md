# public/

Drop your model here as **`DFA-light.glb`** — the app loads `/DFA-light.glb` on
startup. Any other `.glb`/`.gltf` can be loaded at runtime with **Import GLB**
or by dragging it onto the page.

`draco/` and `basis/` are written here automatically by `npm install`
(`scripts/copy-decoders.mjs`). They let Draco-compressed geometry and
KTX2/Basis textures decode locally instead of from a CDN. Leave them in place.
