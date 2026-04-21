import { Dices, Lock, Unlock } from 'lucide-react'
import { useStore } from '../state/store'

export function SeedBar() {
  const seed = useStore((s) => s.params.seed)
  const locked = useStore((s) => s.seedLocked)
  const regenerate = useStore((s) => s.regenerateSeed)
  const setLocked = useStore((s) => s.setSeedLocked)

  const copy = () => {
    navigator.clipboard?.writeText(String(seed)).catch(() => {})
  }

  return (
    <div className="flex items-center gap-3 text-sm font-mono text-neutral-700">
      <button
        onClick={copy}
        title="Click to copy seed"
        className="hover:text-black transition-colors"
      >
        seed <span className="font-semibold">{seed}</span>
      </button>
      <button
        onClick={() => setLocked(!locked)}
        title={locked ? 'Seed locked — unlock to randomize' : 'Lock seed'}
        className="p-1 rounded hover:bg-neutral-200 transition-colors"
      >
        {locked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
      <button
        onClick={regenerate}
        title="Roll a new seed (space)"
        disabled={locked}
        className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Dices size={16} />
      </button>
    </div>
  )
}
