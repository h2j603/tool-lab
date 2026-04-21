import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Slider } from '../primitives/Slider'

export function CompositionSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="composition" title="Composition">
      <Slider
        label="Layers"
        value={params.layerCount}
        min={2}
        max={7}
        step={1}
        onChange={(v) => update({ layerCount: v })}
      />
      <Slider
        label="Coherence"
        value={params.coherence}
        min={0}
        max={1}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ coherence: v })}
      />
      <Slider
        label="Overlap density"
        value={params.overlapDensity}
        min={0.2}
        max={0.6}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ overlapDensity: v })}
      />
    </Section>
  )
}
