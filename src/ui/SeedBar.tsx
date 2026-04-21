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
    <div className="flex items-center gap-1 text-sm font-mono text-neutral-700">
      <button
        onClick={copy}
        title="Click to copy seed"
        className="px-2 py-1.5 min-h-[36px] hover:text-black hover:bg-neutral-100 rounded transition-colors"
      >
        <span className="text-neutral-500">seed </span>
        <span className="font-semibold">{seed}</span>
      </button>
      <button
        onClick={() => setLocked(!locked)}
        title={locked ? 'Seed locked — unlock to randomize' : 'Lock seed'}
        aria-label={locked ? 'Unlock seed' : 'Lock seed'}
        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-neutral-100 transition-colors"
      >
        {locked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>
      <button
        onClick={regenerate}
        title="Roll a new seed (space)"
        aria-label="Roll new seed"
        disabled={locked}
        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Dices size={18} />
      </button>
    </div>
  )
}
