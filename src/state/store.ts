import { create } from 'zustand'
import { Palette, PosterParams } from '../engine/types'
import { PRESET_PALETTES } from '../palettes/presets'
import { DEFAULT_PARAMS } from './defaults'

const STORAGE_KEY = 'color-stack-v1'

interface Persisted {
  params: PosterParams
  customPalettes: Palette[]
  seedLocked: boolean
}

function loadPersisted(): Persisted | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Persisted
    if (!parsed.params) return null
    // Drop uploaded font data from disk — ArrayBuffer does not round-trip.
    if (typeof parsed.params.fontSource === 'object') {
      parsed.params.fontSource = 'system'
    }
    return parsed
  } catch {
    return null
  }
}

function persist(s: { params: PosterParams; customPalettes: Palette[]; seedLocked: boolean }) {
  if (typeof window === 'undefined') return
  const toSave: Persisted = {
    params: {
      ...s.params,
      fontSource: typeof s.params.fontSource === 'object' ? 'system' : s.params.fontSource,
    },
    customPalettes: s.customPalettes,
    seedLocked: s.seedLocked,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // quota — ignore
  }
}

export interface Store {
  params: PosterParams
  presetPalettes: Palette[]
  customPalettes: Palette[]
  seedLocked: boolean

  updateParams: (patch: Partial<PosterParams>) => void
  regenerateSeed: () => void
  setSeedLocked: (locked: boolean) => void

  allPalettes: () => Palette[]
}

const initial = loadPersisted()

export const useStore = create<Store>((set, get) => ({
  params: initial?.params ?? DEFAULT_PARAMS,
  presetPalettes: PRESET_PALETTES,
  customPalettes: initial?.customPalettes ?? [],
  seedLocked: initial?.seedLocked ?? false,

  updateParams: (patch) => {
    set((state) => {
      const next = { ...state, params: { ...state.params, ...patch } }
      persist(next)
      return { params: next.params }
    })
  },
  regenerateSeed: () => {
    const { seedLocked } = get()
    if (seedLocked) return
    const seed = Math.floor(Math.random() * 999999) + 1
    set((state) => {
      const next = { ...state, params: { ...state.params, seed } }
      persist(next)
      return { params: next.params }
    })
  },
  setSeedLocked: (locked) => {
    set((state) => {
      const next = { ...state, seedLocked: locked }
      persist(next)
      return { seedLocked: locked }
    })
  },

  allPalettes: () => [...get().presetPalettes, ...get().customPalettes],
}))
