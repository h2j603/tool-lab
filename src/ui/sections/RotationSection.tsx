import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Slider } from '../primitives/Slider'

export function RotationSection() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)
  const noRotation = params.blockShape === 'circle' || params.blockShape === 'rock'
  return (
    <Section id="rotation" title="Rotation">
      {noRotation && (
        <div className="text-xs text-neutral-500 italic pb-1">
          Rotation has no visual effect on {params.blockShape}s; controls disabled.
        </div>
      )}
      <div className={noRotation ? 'opacity-40 pointer-events-none' : ''}>
        <Slider
          label="Global tilt"
          value={params.globalTilt}
          min={-12}
          max={12}
          step={0.5}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(v) => update({ globalTilt: v })}
        />
        <Slider
          label="Local variation"
          value={params.localVariation}
          min={0}
          max={5}
          step={0.5}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(v) => update({ localVariation: v })}
        />
        <Slider
          label="Skew"
          value={params.skew}
          min={0}
          max={4}
          step={0.5}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(v) => update({ skew: v })}
        />
      </div>
    </Section>
  )
}
