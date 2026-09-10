import { useState } from 'react'
import { LIGHT_TYPES } from '../lib/lightTypes'
import { Slider } from './Slider'

const deg = (v) => `${Math.round(v)}°`
const two = (v) => v.toFixed(2)
const metres = (v) => (v === 0 ? 'unbounded' : `${v.toFixed(2)} m`)

/**
 * One light, whatever its origin.
 *
 * Lights read out of the .glb and lights added here are edited through the
 * same card, with two differences: a file light shows the value it was
 * authored with and cannot be dragged around (its position is part of the
 * model), and it is "removed" rather than deleted, so it can come back.
 */
export function LightCard({ light, onChange, onRemove, onRestore }) {
  const [open, setOpen] = useState(false)
  const meta = LIGHT_TYPES[light.type] ?? { label: light.type, tint: '#d8cdb8', maxIntensity: 10 }
  const fromFile = light.src === 'model'

  // Headroom above the authored value, so a file light can be pushed as well
  // as pulled without the slider losing resolution around its default.
  const maxI = fromFile
    ? Math.max(light.file.intensity * 4, 1)
    : meta.maxIntensity

  if (fromFile && light.removed) {
    return (
      <div className="lite removed">
        <div className="hd">
          <span className="kind" style={{ background: meta.tint }}>{meta.label}</span>
          <span className="nm">{light.name}</span>
          <button className="ghost" onClick={onRestore}>restore</button>
        </div>
      </div>
    )
  }

  return (
    <div className="lite" data-off={light.on ? '0' : '1'}>
      <div className="hd">
        <span className="kind" style={{ background: meta.tint }}>{meta.label}</span>
        <span className="nm" title={light.name}>{light.name}</span>

        <input
          type="color"
          value={light.color}
          title="Colour"
          onChange={(e) => onChange({ color: e.target.value })}
        />

        <button
          className="ghost"
          title={light.on ? 'Mute' : 'Unmute'}
          onClick={() => onChange({ on: !light.on })}
        >
          {light.on ? '◐' : '○'}
        </button>

        <button
          className="ghost"
          aria-pressed={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'less' : 'more'}
        </button>

        <button className="ghost x" title={fromFile ? 'Take out of the scene' : 'Delete'} onClick={onRemove}>×</button>
      </div>

      <Slider
        label="Intensity"
        min={0}
        max={maxI}
        step={maxI / 400}
        value={Math.min(light.intensity, maxI)}
        format={two}
        onChange={(v) => onChange({ intensity: v })}
      />

      {open && (
        <div className="det">
          {(light.type === 'point' || light.type === 'spot') && (
            <>
              <Slider label="Reach" min={0} max={Math.max(20, light.distance * 2)} step={0.05}
                value={light.distance} format={metres}
                onChange={(v) => onChange({ distance: v })} />
              <Slider label="Falloff" min={0} max={3} step={0.05}
                value={light.decay} format={two}
                onChange={(v) => onChange({ decay: v })} />
            </>
          )}

          {light.type === 'spot' && (
            <>
              <Slider label="Cone" min={2} max={85} step={1}
                value={(light.angle * 180) / Math.PI} format={deg}
                onChange={(v) => onChange({ angle: (v * Math.PI) / 180 })} />
              <Slider label="Softness" min={0} max={1} step={0.01}
                value={light.penumbra} format={two}
                onChange={(v) => onChange({ penumbra: v })} />
            </>
          )}

          {light.type === 'area' && (
            <>
              <Slider label="Width" min={0.05} max={6} step={0.05} value={light.width}
                format={metres} onChange={(v) => onChange({ width: v })} />
              <Slider label="Height" min={0.05} max={6} step={0.05} value={light.height}
                format={metres} onChange={(v) => onChange({ height: v })} />
            </>
          )}

          {light.type === 'hemisphere' && (
            <div className="hd">
              <span className="nm sub">Ground bounce</span>
              <input type="color" value={light.groundColor ?? '#3a2c1c'}
                onChange={(e) => onChange({ groundColor: e.target.value })} />
            </div>
          )}

          {/* placement — only for lights this app owns; a file light keeps the
              position it was authored with */}
          {!fromFile && light.type !== 'hemisphere' && light.type !== 'ambient' && (
            <>
              <Slider label="Azimuth" min={-180} max={180} step={1} value={light.az}
                format={deg} onChange={(v) => onChange({ az: v })} />
              <Slider label="Height" min={-85} max={85} step={1} value={light.el}
                format={deg} onChange={(v) => onChange({ el: v })} />
              <Slider label="Distance" min={0.2} max={20} step={0.05} value={light.dist}
                format={metres} onChange={(v) => onChange({ dist: v })} />
            </>
          )}

          {light.type !== 'ambient' && light.type !== 'area' && light.type !== 'hemisphere' && (
            <label className="chk">
              <input type="checkbox" checked={!!light.castShadow}
                onChange={(e) => onChange({ castShadow: e.target.checked })} />
              <span>Cast shadows{light.type === 'point' ? ' (costly)' : ''}</span>
            </label>
          )}

          {fromFile && (
            <div className="note">
              file value {light.file.intensity.toFixed(2)} · placed by the model
            </div>
          )}
        </div>
      )}
    </div>
  )
}
