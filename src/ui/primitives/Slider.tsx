import { ChangeEvent } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))
  const display = format ? format(value) : String(value)
  return (
    <label className="block text-xs">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-neutral-600">{label}</span>
        <span className="font-mono text-neutral-900">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        className="w-full accent-black"
      />
    </label>
  )
}
