import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Slider } from '../primitives/Slider'
import { Toggle } from '../primitives/Toggle'

export function PatternSection() {
  const moire = useStore((s) => s.params.moire)
  const update = useStore((s) => s.updateParams)

  const patch = (partial: Partial<typeof moire>) =>
    update({ moire: { ...moire, ...partial } })

  return (
    <Section id="pattern" title="Pattern">
      <Toggle
        label="Moiré"
        description="Two overlaid dot grids at a small angle difference — the interference is the identity feature of the tool."
        checked={moire.enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      <div className={moire.enabled ? '' : 'opacity-40 pointer-events-none'}>
        <Slider
          label="Angle delta"
          value={moire.baseAngleDelta}
          min={0.5}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(v) => patch({ baseAngleDelta: v })}
        />
        <Slider
          label="Spacing"
          value={moire.baseSpacing}
          min={0.5}
          max={5}
          step={0.1}
          format={(v) => `${v.toFixed(1)}mm`}
          onChange={(v) => patch({ baseSpacing: v })}
        />
        <Slider
          label="Dot radius"
          value={moire.baseDotRadius}
          min={0.15}
          max={0.45}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ baseDotRadius: v })}
        />
        <Slider
          label="Variation"
          value={moire.variation}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ variation: v })}
        />
        <label className="block text-xs">
          <div className="text-neutral-600 mb-1">Interference color</div>
          <div className="flex gap-2 items-center">
            <select
              value={moire.interferenceColor === 'auto' ? 'auto' : 'custom'}
              onChange={(e) =>
                patch({
                  interferenceColor: e.target.value === 'auto' ? 'auto' : '#000000',
                })
              }
              className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-black"
            >
              <option value="auto">Auto (darken block)</option>
              <option value="custom">Custom hex</option>
            </select>
            {moire.interferenceColor !== 'auto' && (
              <input
                type="color"
                value={moire.interferenceColor}
                onChange={(e) => patch({ interferenceColor: e.target.value })}
                className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
              />
            )}
          </div>
        </label>
      </div>
    </Section>
  )
}
