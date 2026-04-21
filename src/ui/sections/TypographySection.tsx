import { TypePlacement } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Slider } from '../primitives/Slider'

const SYSTEM_FONTS: { value: string; label: string }[] = [
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica / Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'ui-monospace, Menlo, monospace', label: 'Mono' },
  { value: '"Times New Roman", serif', label: 'Times' },
]

export function TypographySection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  const isSystem = params.fontSource === 'system'
  return (
    <Section id="typography" title="Typography">
      <label className="block text-xs">
        <div className="text-neutral-600 mb-1">Text</div>
        <textarea
          value={params.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={4}
          className="w-full border border-neutral-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-black resize-none"
        />
      </label>
      {isSystem && (
        <Select
          label="System font"
          value={params.fontFamily}
          options={SYSTEM_FONTS}
          onChange={(v) => update({ fontFamily: v })}
        />
      )}
      {!isSystem && typeof params.fontSource === 'object' && (
        <div className="text-xs text-neutral-600">
          Uploaded: <span className="font-mono">{params.fontSource.name}</span>
          <button
            className="ml-2 underline hover:text-black"
            onClick={() => update({ fontSource: 'system' })}
          >
            remove
          </button>
        </div>
      )}
      <Slider
        label="Text size"
        value={params.textSize}
        min={0.1}
        max={0.5}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ textSize: v })}
      />
      <Select<TypePlacement>
        label="Placement"
        value={params.typePlacement}
        options={[
          { value: 'boundary-cross', label: 'Boundary-crossing' },
          { value: 'single-layer', label: 'Single layer (experimental)' },
          { value: 'scattered', label: 'Scattered (experimental)' },
        ]}
        onChange={(v) => update({ typePlacement: v })}
      />
    </Section>
  )
}
