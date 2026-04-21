import { ChevronDown, ChevronRight } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'

interface SectionProps {
  id: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

const STORAGE_KEY = 'color-stack-v1:sections'

function loadOpenMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveOpenMap(map: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function Section({ id, title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState<boolean>(() => {
    const map = loadOpenMap()
    return map[id] ?? defaultOpen
  })

  useEffect(() => {
    const map = loadOpenMap()
    map[id] = open
    saveOpenMap(map)
  }, [id, open])

  return (
    <section className="border-b border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 py-2 px-1 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-black"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
      </button>
      {open && <div className="pb-4 pt-1 px-1 space-y-3">{children}</div>}
    </section>
  )
}
