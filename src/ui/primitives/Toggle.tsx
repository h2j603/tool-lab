interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-black w-4 h-4"
      />
      <div className="text-xs">
        <div className="text-neutral-800">{label}</div>
        {description && <div className="text-neutral-500 mt-0.5 leading-relaxed">{description}</div>}
      </div>
    </label>
  )
}
