import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Toggle } from '../primitives/Toggle'

export function ExperimentalSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="experimental" title="Experimental" defaultOpen={false}>
      <Toggle
        label="Break rules"
        description="Relaxes weight hierarchy (B), free proportions (C), and single-layer/scattered placement (F). Rules A, D, E, G still enforced."
        checked={params.experimental.enabled}
        onChange={(v) => update({ experimental: { enabled: v } })}
      />
    </Section>
  )
}
