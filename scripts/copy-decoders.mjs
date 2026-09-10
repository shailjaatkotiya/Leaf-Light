/**
 * Copies three's DRACO + KTX2(basis) decoders into public/ so compressed .glb
 * files load without reaching out to a CDN. Runs automatically after install.
 */
import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jobs = [
  ['node_modules/three/examples/jsm/libs/draco/', 'public/draco/'],
  ['node_modules/three/examples/jsm/libs/basis/', 'public/basis/'],
]

for (const [from, to] of jobs) {
  const src = resolve(root, from)
  const dest = resolve(root, to)
  if (!existsSync(src)) {
    console.warn(`[decoders] skipped, not found: ${from}`)
    continue
  }
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log(`[decoders] ${from} -> ${to}`)
}
