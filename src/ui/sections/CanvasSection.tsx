import { CanvasSize } from '../../engine/types'
import { useStore } from '../../state/store'
import { NumberInput } from '../primitives/NumberInput'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Toggle } from '../primitives/Toggle'

export function CanvasSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="canvas" title="Canvas">
      <Select<CanvasSize>
        label="Size"
        value={params.canvasSize}
        options={[
          { value: 'A3', label: 'A3 (297 × 420 mm)' },
          { value: 'A2', label: 'A2 (420 × 594 mm)' },
          { value: 'B1', label: 'B1 (707 × 1000 mm)' },
          { value: 'custom', label: 'Custom' },
        ]}
        onChange={(v) => update({ canvasSize: v })}
      />
      {params.canvasSize === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Width"
            value={params.customCanvasWidth ?? 297}
            min={100}
            max={2000}
            suffix="mm"
            onChange={(v) => update({ customCanvasWidth: v })}
          />
          <NumberInput
            label="Height"
            value={params.customCanvasHeight ?? 420}
            min={100}
            max={2000}
            suffix="mm"
            onChange={(v) => update({ customCanvasHeight: v })}
          />
        </div>
      )}
      <Toggle
        label="3mm bleed"
        checked={params.bleedMm > 0}
        onChange={(v) => update({ bleedMm: v ? 3 : 0 })}
      />
    </Section>
  )
}
