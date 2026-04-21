import { ChangeEvent } from 'react'

interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}

export function NumberInput({ label, value, min, max, step, onChange, suffix }: NumberInputProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    if (Number.isFinite(n)) onChange(n)
  }
  return (
    <label className="block text-xs">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-neutral-600">{label}</span>
        {suffix && <span className="text-neutral-400 font-mono">{suffix}</span>}
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={handle}
        className="w-full border border-neutral-300 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-black"
      />
    </label>
  )
}
