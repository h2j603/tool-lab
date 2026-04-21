import { ProportionSet } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Slider } from '../primitives/Slider'

export function ProportionSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="proportion" title="Proportion">
      <Select<ProportionSet>
        label="Set"
        value={params.proportionSet}
        options={[
          { value: 'classical', label: 'Classical (1, √2, φ, 2, 3, 5)' },
          { value: 'extreme', label: 'Extreme (1, 2, 4, 7, 11)' },
          { value: 'balanced', label: 'Balanced (1, √2, 2)' },
        ]}
        onChange={(v) => update({ proportionSet: v })}
      />
      <Slider
        label="Base size"
        value={params.baseSize}
        min={0.3}
        max={0.9}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ baseSize: v })}
      />
    </Section>
  )
}
