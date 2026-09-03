# Banana Leaf Pendant — three.js viewer

Static site. `index.html` is fully self-contained: three.js r128 and the
GLB model are both embedded, so there is nothing to build and no CDN or
CORS dependency. `banana_leaf_pendant.glb` is included separately as the
source asset.

## Deploy to Vercel

Option A — drag and drop
1. Go to https://vercel.com/new
2. Drag this whole folder onto the page
3. Framework preset: **Other**. No build command, no output directory.

Option B — CLI
```bash
cd deploy
npx vercel --prod
```

Option C — Git
Commit this folder to a repo and import it at https://vercel.com/new.
