import { PatternType, RingsCenterMode } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Slider } from '../primitives/Slider'
import { Toggle } from '../primitives/Toggle'

export function PatternSection() {
  const pattern = useStore((s) => s.params.pattern)
  const update = useStore((s) => s.updateParams)

  const patch = (partial: Partial<typeof pattern>) =>
    update({ pattern: { ...pattern, ...partial } })

  return (
    <Section id="pattern" title="Pattern">
      <Toggle
        label="Enable"
        description="When off, every block renders as a solid fill."
        checked={pattern.enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      <div className={pattern.enabled ? '' : 'opacity-40 pointer-events-none'}>
        <Select<PatternType>
          label="Type"
          value={pattern.type}
          options={[
            { value: 'moire', label: 'Moiré (interference dots)' },
            { value: 'stripes', label: 'Stripes (thick op-art bars)' },
            { value: 'rings', label: 'Rings (concentric circles)' },
          ]}
          onChange={(v) => patch({ type: v })}
        />
        <Slider
          label="Density"
          value={pattern.density}
          min={0.2}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ density: v })}
        />
        <Slider
          label="Contrast"
          value={pattern.contrast}
          min={0.3}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ contrast: v })}
        />
        <Slider
          label="Variation"
          value={pattern.variation}
          min={0}
          max={0.6}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ variation: v })}
        />
        <label className="block text-xs">
          <div className="text-neutral-600 mb-1">Secondary color</div>
          <div className="flex gap-2 items-center">
            <select
              value={pattern.secondaryColor === 'auto' ? 'auto' : 'custom'}
              onChange={(e) =>
                patch({
                  secondaryColor: e.target.value === 'auto' ? 'auto' : '#000000',
                })
              }
              className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-black"
            >
              <option value="auto">Auto (derived from contrast)</option>
              <option value="custom">Custom hex</option>
            </select>
            {pattern.secondaryColor !== 'auto' && (
              <input
                type="color"
                value={pattern.secondaryColor}
                onChange={(e) => patch({ secondaryColor: e.target.value })}
                className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
              />
            )}
          </div>
        </label>

        <div className="border-t border-neutral-200 pt-3 space-y-3">
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
            {pattern.type}-specific
          </div>
          {pattern.type === 'moire' && (
            <Slider
              label="Angle delta"
              value={pattern.moire.baseAngleDelta}
              min={0.3}
              max={5}
              step={0.1}
              format={(v) => `${v.toFixed(1)}°`}
              onChange={(v) => patch({ moire: { ...pattern.moire, baseAngleDelta: v } })}
            />
          )}
          {pattern.type === 'stripes' && (
            <Slider
              label="Base angle"
              value={pattern.stripes.angle}
              min={0}
              max={180}
              step={1}
              format={(v) => `${v.toFixed(0)}°`}
              onChange={(v) => patch({ stripes: { ...pattern.stripes, angle: v } })}
            />
          )}
          {pattern.type === 'rings' && (
            <>
              <Select<RingsCenterMode>
                label="Center mode"
                value={pattern.rings.centerMode}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'offset', label: 'Offset (noise)' },
                  { value: 'random', label: 'Random' },
                ]}
                onChange={(v) => patch({ rings: { ...pattern.rings, centerMode: v } })}
              />
              <Slider
                label="Ring count hint"
                value={pattern.rings.ringCount}
                min={3}
                max={20}
                step={1}
                format={(v) => v.toFixed(0)}
                onChange={(v) => patch({ rings: { ...pattern.rings, ringCount: v } })}
              />
            </>
          )}
        </div>
      </div>
    </Section>
  )
}
