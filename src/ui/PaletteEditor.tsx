import { Copy, Plus, Trash2 } from 'lucide-react'
import { ColorRole } from '../engine/types'
import { useStore } from '../state/store'

const ROLE_OPTIONS: { value: ColorRole; label: string }[] = [
  { value: 'dominant', label: 'Dominant' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'accent', label: 'Accent' },
  { value: 'background', label: 'Background' },
]

function isHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s) || /^#[0-9a-fA-F]{3}$/.test(s)
}

export function PaletteEditor() {
  const paletteId = useStore((s) => s.params.paletteId)
  const palette = useStore((s) =>
    s.presetPalettes.find((p) => p.id === paletteId) ??
    s.customPalettes.find((p) => p.id === paletteId),
  )
  const duplicate = useStore((s) => s.duplicatePalette)
  const rename = useStore((s) => s.renamePalette)
  const updateColor = useStore((s) => s.updatePaletteColor)
  const addColor = useStore((s) => s.addPaletteColor)
  const removeColor = useStore((s) => s.removePaletteColor)
  const del = useStore((s) => s.deletePalette)

  if (!palette) return null

  const editable = palette.isCustom
  const roleCounts: Record<ColorRole, number> = {
    dominant: 0,
    secondary: 0,
    accent: 0,
    background: 0,
  }
  palette.colors.forEach((c) => {
    roleCounts[c.role]++
  })
  const roleViolation = (role: ColorRole): boolean => {
    // Must keep at least one of: dominant, accent, background
    if (role === 'dominant' && roleCounts.dominant <= 1) return true
    if (role === 'accent' && roleCounts.accent <= 1) return true
    if (role === 'background' && roleCounts.background <= 1) return true
    return false
  }

  return (
    <div className="space-y-2 border-t border-neutral-200 pt-3">
      <div className="flex items-center justify-between">
        {editable ? (
          <input
            className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none w-40"
            value={palette.name}
            onChange={(e) => rename(palette.id, e.target.value)}
          />
        ) : (
          <div className="text-xs font-semibold text-neutral-700">{palette.name}</div>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => duplicate(palette.id)}
            title="Duplicate as editable custom palette"
            aria-label="Duplicate palette"
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-neutral-100"
          >
            <Copy size={15} />
          </button>
          {editable && (
            <button
              onClick={() => {
                if (confirm(`Delete palette "${palette.name}"?`)) del(palette.id)
              }}
              title="Delete palette"
              aria-label="Delete palette"
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-red-50 text-red-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {palette.colors.map((c, i) => {
          const canRemove =
            editable && palette.colors.length > 3 && !roleViolation(c.role)
          return (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <input
                type="color"
                value={isHex(c.hex) ? c.hex : '#000000'}
                onChange={(e) => updateColor(palette.id, i, { hex: e.target.value })}
                disabled={!editable}
                aria-label="Color picker"
                className="w-8 h-8 border border-neutral-300 rounded cursor-pointer disabled:cursor-not-allowed shrink-0"
              />
              <input
                value={c.hex}
                onChange={(e) => updateColor(palette.id, i, { hex: e.target.value })}
                disabled={!editable}
                aria-label="Hex value"
                className="w-[84px] border border-neutral-300 rounded px-1.5 py-1 text-xs font-mono focus:outline-none focus:border-black disabled:bg-neutral-50"
              />
              <select
                value={c.role}
                onChange={(e) => updateColor(palette.id, i, { role: e.target.value as ColorRole })}
                disabled={!editable}
                aria-label="Color role"
                className="flex-1 min-w-[100px] border border-neutral-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:border-black disabled:bg-neutral-50"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {editable && (
                <button
                  onClick={() => removeColor(palette.id, i)}
                  disabled={!canRemove}
                  title={canRemove ? 'Remove color' : 'Cannot remove — role required'}
                  aria-label="Remove color"
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {editable && palette.colors.length < 6 && (
        <button
          onClick={() => addColor(palette.id, 'secondary')}
          className="flex items-center gap-1 py-1.5 text-xs text-neutral-600 hover:text-black"
        >
          <Plus size={14} /> Add color
        </button>
      )}
      {!editable && (
        <div className="text-[11px] text-neutral-500 italic">
          Presets are read-only. Duplicate to edit.
        </div>
      )}
    </div>
  )
}
