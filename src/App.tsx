import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Canvas } from './ui/Canvas'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { ExportBar } from './ui/ExportBar'
import { ParameterPanel } from './ui/ParameterPanel'
import { SeedBar } from './ui/SeedBar'
import { useStore } from './state/store'

export function App() {
  const regenerate = useStore((s) => s.regenerateSeed)
  const [mobileView, setMobileView] = useState<'canvas' | 'panel'>('canvas')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isFormField(e.target)) {
        e.preventDefault()
        regenerate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [regenerate])

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="flex items-center justify-between px-4 lg:px-5 py-2.5 lg:py-3 border-b border-neutral-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileView(mobileView === 'canvas' ? 'panel' : 'canvas')}
            className="lg:hidden p-2 -ml-2 rounded hover:bg-neutral-100"
            aria-label={mobileView === 'canvas' ? 'Show parameters' : 'Show canvas'}
          >
            {mobileView === 'canvas' ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="font-mono text-sm tracking-wide truncate">color-stack</div>
        </div>
        <SeedBar />
      </header>

      <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
        <main
          className={`flex-1 min-w-0 bg-neutral-100 ${
            mobileView === 'canvas' ? 'flex' : 'hidden'
          } lg:flex`}
        >
          <ErrorBoundary>
            <Canvas />
          </ErrorBoundary>
        </main>

        <aside
          className={`lg:w-80 lg:border-l border-neutral-200 bg-white flex-col min-h-0 ${
            mobileView === 'panel' ? 'flex flex-1' : 'hidden'
          } lg:flex`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ParameterPanel />
          </div>
          <ExportBar />
        </aside>
      </div>
    </div>
  )
}

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
