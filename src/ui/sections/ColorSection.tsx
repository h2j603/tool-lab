import { useStore } from '../../state/store'
import { PaletteEditor } from '../PaletteEditor'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'

export function ColorSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  const palettes = useStore((s) => [...s.presetPalettes, ...s.customPalettes])
  const active = palettes.find((p) => p.id === params.paletteId)

  return (
    <Section id="color" title="Color">
      <Select
        label="Palette"
        value={params.paletteId}
        options={palettes.map((p) => ({
          value: p.id,
          label: p.isCustom ? `${p.name} (custom)` : p.name,
        }))}
        onChange={(v) => update({ paletteId: v })}
      />
      {active && <div className="text-xs text-neutral-500 italic">{active.character}</div>}
      <PaletteEditor />
    </Section>
  )
}
