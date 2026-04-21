import { ChangeEvent } from 'react'

interface SelectProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const handle = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)
  return (
    <label className="block text-xs">
      <div className="text-neutral-600 mb-1">{label}</div>
      <select
        value={value}
        onChange={handle}
        className="w-full border border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-black"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
