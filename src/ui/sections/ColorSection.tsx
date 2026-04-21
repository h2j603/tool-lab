import { useStore } from '../../state/store'
import { PaletteEditor } from '../PaletteEditor'
import { Section } from '../primitives/Section'

export function ColorSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  const palettes = useStore((s) => [...s.presetPalettes, ...s.customPalettes])
  const active = palettes.find((p) => p.id === params.paletteId)

  return (
    <Section id="color" title="Color">
      <label className="block text-xs">
        <div className="text-neutral-600 mb-1">Palette</div>
        <select
          value={params.paletteId}
          onChange={(e) => update({ paletteId: e.target.value })}
          className="w-full border border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-black"
        >
          {palettes.map((p) => (
            <option key={p.id} value={p.id} title={p.character}>
              {p.isCustom ? `${p.name} (custom)` : p.name}
            </option>
          ))}
        </select>
      </label>
      {active && <div className="text-xs text-neutral-500 italic">{active.character}</div>}
      <PaletteEditor />
    </Section>
  )
}
