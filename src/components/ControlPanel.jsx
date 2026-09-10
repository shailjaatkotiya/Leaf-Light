import { useRef } from 'react'
import { useStudio } from '../state/useStudio'
import { ADDABLE, LIGHT_TYPES } from '../lib/lightTypes'
import { LightCard } from './LightCard'
import { Slider } from './Slider'

const mm = (v) => (v ? `${Math.round(v * 1000).toLocaleString()} mm` : '—')
const two = (v) => v.toFixed(2)

function Toggle({ on, onClick, children, title }) {
  return (
    <button aria-pressed={on} onClick={onClick} title={title}>{children}</button>
  )
}

export function ControlPanel() {
  const s = useStudio()
  const fileIn = useRef()

  const live = s.modelLights.filter((l) => !l.removed)

  return (
    <aside className="panel" id="ctl">
      <section className="sticky">
        <span className="lbl">Model</span>
        <div className="modelRow" title={s.modelName}>{s.modelName}</div>
        <div className="chips">
          <button onClick={() => fileIn.current.click()}>Import GLB</button>
          <button onClick={() => s.loadUrl('/DFA-light.glb', 'DFA-light.glb')}>Reload default</button>
        </div>
        <input
          ref={fileIn}
          type="file"
          accept=".glb,.gltf"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            s.loadBuffer(await f.arrayBuffer(), f.name)
            e.target.value = ''
          }}
        />
      </section>

      <section>
        <span className="lbl">Dimensions</span>
        <dl>
          <dt>Width</dt><dd>{mm(s.stats.dia)}</dd>
          <dt>Height</dt><dd>{mm(s.stats.drop)}</dd>
          <dt>Triangles</dt><dd>{s.stats.tris.toLocaleString()}</dd>
          <dt>Meshes</dt><dd>{s.stats.meshes}</dd>
          <dt>Materials</dt><dd>{s.stats.materials}</dd>
        </dl>
      </section>

      <section>
        <span className="lbl">
          Lights in the model
          <b className="cnt">
            {s.modelLights.length
              ? live.length === s.modelLights.length ? live.length : `${live.length} / ${s.modelLights.length}`
              : '0'}
          </b>
        </span>

        {s.modelLights.length > 0 && (
          <Slider
            label="Fixture output"
            min={0} max={3} step={0.01}
            value={s.lampScale} format={two}
            onChange={(v) => s.set({ lampScale: v })}
          />
        )}

        <div className="list">
          {s.modelLights.map((l) => (
            <LightCard
              key={l.id}
              light={l}
              onChange={(patch) => s.updateModelLight(l.id, patch)}
              onRemove={() => s.removeModelLight(l.id)}
              onRestore={() => s.restoreModelLight(l.id)}
            />
          ))}
          {!s.modelLights.length && (
            <p className="empty">
              This model carries no lights of its own — a stand-in studio pair is lighting it.
            </p>
          )}
        </div>

        {s.modelLights.length > 0 && (
          <div className="chips">
            <button onClick={() => s.setAllModelLights(true)}>All on</button>
            <button onClick={() => s.setAllModelLights(false)}>All off</button>
            <button onClick={s.resetModelLights}>File defaults</button>
          </div>
        )}
      </section>

      <section>
        <span className="lbl">
          Added lights<b className="cnt">{s.addedLights.length}</b>
        </span>

        <div className="list">
          {s.addedLights.map((l) => (
            <LightCard
              key={l.id}
              light={l}
              onChange={(patch) => s.updateAddedLight(l.id, patch)}
              onRemove={() => s.removeAddedLight(l.id)}
            />
          ))}
          {!s.addedLights.length && (
            <p className="empty">No added lights — the model is lit by its own lights alone.</p>
          )}
        </div>

        <span className="lbl">Add a light</span>
        <div className="chips">
          {ADDABLE.map((t) => (
            <button key={t} onClick={() => s.addLight(t)} title={`Add a ${LIGHT_TYPES[t].name.toLowerCase()} light`}>
              {LIGHT_TYPES[t].name}
            </button>
          ))}
        </div>
        <div className="chips">
          <button onClick={s.studioFill}>Studio fill</button>
          <button onClick={s.clearAddedLights} disabled={!s.addedLights.length}>Clear added</button>
        </div>
      </section>

      <section>
        <span className="lbl">Render</span>
        <Slider label="Exposure" min={0.1} max={3} step={0.01} value={s.exposure}
          format={two} onChange={(v) => s.set({ exposure: v })} />
        <Slider label="Glow" min={0} max={2} step={0.01} value={s.bloom}
          format={two} onChange={(v) => s.set({ bloom: v })} />
        <Slider label="Glow threshold" min={0} max={2} step={0.01} value={s.bloomThreshold}
          format={two} onChange={(v) => s.set({ bloomThreshold: v })} />
        <Slider label="Emissive boost" min={0} max={6} step={0.05} value={s.emissiveBoost}
          format={two} onChange={(v) => s.set({ emissiveBoost: v })} />
        <Slider label="Environment" min={0} max={4} step={0.05} value={s.envIntensity}
          format={two} onChange={(v) => s.set({ envIntensity: v })} />
        <div className="chips">
          <Toggle on={s.unclampEmissive} onClick={() => s.set({ unclampEmissive: !s.unclampEmissive })}
            title="Let emissive surfaces run past the tone-map shoulder so they bloom">
            Unclamp emissive
          </Toggle>
          <Toggle on={s.shadows} onClick={() => s.set({ shadows: !s.shadows })}>Shadows</Toggle>
          <Toggle on={s.showFloor} onClick={() => s.set({ showFloor: !s.showFloor })}>Floor</Toggle>
        </div>
      </section>

      <section>
        <span className="lbl">View</span>
        <div className="chips">
          <Toggle on={s.autoRotate} onClick={() => s.set({ autoRotate: !s.autoRotate })}>Auto-spin</Toggle>
          <Toggle on={s.gizmos} onClick={() => s.set({ gizmos: !s.gizmos })}>Gizmos</Toggle>
          <Toggle on={s.wireframe} onClick={() => s.set({ wireframe: !s.wireframe })}>Wireframe</Toggle>
        </div>
      </section>
    </aside>
  )
}
