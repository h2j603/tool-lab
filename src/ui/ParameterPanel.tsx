import { useStore } from '../state/store'
import { Slider } from './primitives/Slider'

export function ParameterPanel() {
  const params = useStore((s) => s.params)
  const update = useStore((s) => s.updateParams)

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full text-sm">
      <section>
        <h3 className="font-semibold text-neutral-900 mb-2">Composition</h3>
        <div className="space-y-3">
          <Slider
            label="Layers"
            value={params.layerCount}
            min={2}
            max={7}
            step={1}
            onChange={(v) => update({ layerCount: v })}
          />
        </div>
      </section>
    </div>
  )
}
