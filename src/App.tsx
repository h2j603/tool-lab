import { useEffect } from 'react'
import { Canvas } from './ui/Canvas'
import { ParameterPanel } from './ui/ParameterPanel'
import { SeedBar } from './ui/SeedBar'
import { useStore } from './state/store'

export function App() {
  const regenerate = useStore((s) => s.regenerateSeed)

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
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-white">
        <div className="font-mono text-sm tracking-wide">color-stack</div>
        <SeedBar />
      </header>
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 min-w-0 bg-neutral-100">
          <Canvas />
        </main>
        <aside className="w-80 border-l border-neutral-200 bg-white">
          <ParameterPanel />
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
