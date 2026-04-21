interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-black"
      />
      <div className="text-xs">
        <div className="text-neutral-800">{label}</div>
        {description && <div className="text-neutral-500 mt-0.5">{description}</div>}
      </div>
    </label>
  )
}
