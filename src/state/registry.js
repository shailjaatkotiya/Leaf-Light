/**
 * Non-reactive side table.
 *
 * The store below keeps only plain, serialisable descriptions of lights so that
 * React can re-render cheaply. The actual THREE.Light instances that came out
 * of the .glb live here, keyed by the same id. Keeping them out of zustand
 * avoids deep-proxying three's object graph on every slider move.
 */
const objects = new Map()

export const registry = {
  set: (id, obj) => objects.set(id, obj),
  get: (id) => objects.get(id),
  delete: (id) => objects.delete(id),
  clear: () => objects.clear(),
  entries: () => Array.from(objects.entries()),
}
