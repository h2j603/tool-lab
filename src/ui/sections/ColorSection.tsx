import { useStore } from '../../state/store'
import { ColorSwatch } from '../primitives/ColorSwatch'
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
        options={palettes.map((p) => ({ value: p.id, label: p.isCustom ? `${p.name} *` : p.name }))}
        onChange={(v) => update({ paletteId: v })}
      />
      {active && (
        <>
          <div className="text-xs text-neutral-500 italic">{active.character}</div>
          <div className="flex gap-1.5 flex-wrap">
            {active.colors.map((c, i) => (
              <ColorSwatch key={i} hex={c.hex} title={`${c.role}: ${c.hex}`} />
            ))}
          </div>
        </>
      )}
    </Section>
  )
}
