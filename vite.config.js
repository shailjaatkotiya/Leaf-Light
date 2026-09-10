import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  // .glb files in public/ are served as-is; large models stream fine in dev.
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr'],
  build: { chunkSizeWarningLimit: 2000 },
})
