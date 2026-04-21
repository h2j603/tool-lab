import { MacroMode } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'

export function MacroModeSection() {
  const mode = useStore((s) => s.params.macroMode)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="macro-mode" title="Macro Mode">
      <Select<MacroMode>
        label="Mode"
        value={mode}
        options={[
          { value: 'vertical-stack', label: 'Vertical Stack' },
          { value: 'letter-form', label: 'Letter Form' },
        ]}
        onChange={(v) => update({ macroMode: v })}
      />
    </Section>
  )
}
