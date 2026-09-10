/** Labelled range input with a live, right-aligned readout. */
export function Slider({ label, min, max, step, value, format, onChange }) {
  return (
    <label className="sld">
      <span className="cap">
        <span>{label}</span>
        <b>{format ? format(value) : value}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? (max - min) / 200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
