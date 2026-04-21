import { BlockShape } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Slider } from '../primitives/Slider'

export function CompositionSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  return (
    <Section id="composition" title="Composition">
      <Select<BlockShape>
        label="Block shape"
        value={params.blockShape}
        options={[
          { value: 'rectangle', label: 'Rectangle' },
          { value: 'circle', label: 'Circle' },
          { value: 'rock', label: 'Rock (noise polygon)' },
        ]}
        onChange={(v) => update({ blockShape: v })}
      />
      {params.blockShape === 'rock' && (
        <>
          <Slider
            label="Rock roughness"
            value={params.rockParams.roughness}
            min={0}
            max={0.5}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={(v) =>
              update({ rockParams: { ...params.rockParams, roughness: v } })
            }
          />
          <Slider
            label="Rock spikiness"
            value={params.rockParams.spikiness}
            min={0}
            max={1}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={(v) =>
              update({ rockParams: { ...params.rockParams, spikiness: v } })
            }
          />
          <Slider
            label="Rock vertices"
            value={params.rockParams.vertexCount}
            min={12}
            max={64}
            step={1}
            format={(v) => v.toFixed(0)}
            onChange={(v) =>
              update({ rockParams: { ...params.rockParams, vertexCount: v } })
            }
          />
        </>
      )}
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
        min={0.03}
        max={0.2}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ overlapDepth: v })}
      />
    </Section>
  )
}
