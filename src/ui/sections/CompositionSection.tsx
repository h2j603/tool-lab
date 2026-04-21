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
        max={6}
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
        label="Overlap depth"
        value={params.overlapDepth}
        min={0.1}
        max={0.4}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ overlapDepth: v })}
      />
      <Slider
        label="Breathing room"
        value={params.breathingRoom}
        min={0}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ breathingRoom: v })}
      />
    </Section>
  )
}
