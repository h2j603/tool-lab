import { create } from 'zustand'
import opentype from 'opentype.js'
import { BundledFontId, ColorRole, Palette, PaletteColor, PosterParams } from '../engine/types'
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
    if (typeof parsed.params.fontSource === 'object') {
      parsed.params.fontSource = 'system'
    }
    // Merge with defaults so schema changes don't leave params partially populated.
    const migrated = { ...DEFAULT_PARAMS, ...parsed.params } as PosterParams & {
      overlapDensity?: number
    }
    delete migrated.overlapDensity
    parsed.params = migrated
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

export interface UploadedFont {
  name: string
  opentypeFont: opentype.Font
}

export type BundledFontStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Store {
  params: PosterParams
  presetPalettes: Palette[]
  customPalettes: Palette[]
  seedLocked: boolean
  uploadedFont: UploadedFont | null
  bundledFonts: Partial<Record<BundledFontId, opentype.Font>>
  bundledFontStatus: BundledFontStatus
  bundledFontError: string | null

  updateParams: (patch: Partial<PosterParams>) => void
  regenerateSeed: () => void
  setSeedLocked: (locked: boolean) => void

  duplicatePalette: (sourceId: string) => string | null
  renamePalette: (id: string, name: string) => void
  updatePaletteColor: (paletteId: string, colorIndex: number, patch: Partial<PaletteColor>) => void
  addPaletteColor: (paletteId: string, role: ColorRole) => void
  removePaletteColor: (paletteId: string, colorIndex: number) => void
  deletePalette: (id: string) => void

  setUploadedFont: (font: UploadedFont | null) => void
  loadBundledFonts: () => Promise<void>

  allPalettes: () => Palette[]
  getPalette: (id: string) => Palette | undefined
}

const BUNDLED_FONT_FILES: Record<BundledFontId, string> = {
  'inter': 'Inter.ttf',
  'noto-sans-kr': 'NotoSansKR.ttf',
}

async function fetchBundledFont(id: BundledFontId): Promise<opentype.Font> {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const url = `${base}fonts/${BUNDLED_FONT_FILES[id]}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  return opentype.parse(buf)
}

const initial = loadPersisted()

let customIdCounter = 1

function nextCustomId(existing: Palette[]): string {
  const ids = new Set(existing.map((p) => p.id))
  while (ids.has(`custom-${customIdCounter}`)) customIdCounter++
  return `custom-${customIdCounter++}`
}

export const useStore = create<Store>((set, get) => ({
  params: initial?.params ?? DEFAULT_PARAMS,
  presetPalettes: PRESET_PALETTES,
  customPalettes: initial?.customPalettes ?? [],
  seedLocked: initial?.seedLocked ?? false,
  uploadedFont: null,
  bundledFonts: {},
  bundledFontStatus: 'idle',
  bundledFontError: null,

  updateParams: (patch) => {
    set((state) => {
      const nextParams = { ...state.params, ...patch }
      persist({ ...state, params: nextParams })
      return { params: nextParams }
    })
  },
  regenerateSeed: () => {
    const { seedLocked } = get()
    if (seedLocked) return
    const seed = Math.floor(Math.random() * 999999) + 1
    set((state) => {
      const nextParams = { ...state.params, seed }
      persist({ ...state, params: nextParams })
      return { params: nextParams }
    })
  },
  setSeedLocked: (locked) => {
    set((state) => {
      persist({ ...state, seedLocked: locked })
      return { seedLocked: locked }
    })
  },

  duplicatePalette: (sourceId) => {
    const source = get().getPalette(sourceId)
    if (!source) return null
    const all = [...get().presetPalettes, ...get().customPalettes]
    const id = nextCustomId(all)
    const copy: Palette = {
      ...source,
      id,
      name: `${source.name} copy`,
      isCustom: true,
      basedOn: source.isCustom ? source.basedOn : source.id,
      colors: source.colors.map((c) => ({ ...c })),
    }
    set((state) => {
      const customPalettes = [...state.customPalettes, copy]
      const nextParams = { ...state.params, paletteId: id }
      persist({ ...state, customPalettes, params: nextParams })
      return { customPalettes, params: nextParams }
    })
    return id
  },

  renamePalette: (id, name) => {
    set((state) => {
      const customPalettes = state.customPalettes.map((p) =>
        p.id === id ? { ...p, name } : p,
      )
      persist({ ...state, customPalettes })
      return { customPalettes }
    })
  },

  updatePaletteColor: (paletteId, colorIndex, patch) => {
    set((state) => {
      const customPalettes = state.customPalettes.map((p) => {
        if (p.id !== paletteId) return p
        const colors = p.colors.map((c, i) => (i === colorIndex ? { ...c, ...patch } : c))
        return { ...p, colors }
      })
      persist({ ...state, customPalettes })
      return { customPalettes }
    })
  },

  addPaletteColor: (paletteId, role) => {
    set((state) => {
      const customPalettes = state.customPalettes.map((p) => {
        if (p.id !== paletteId) return p
        if (p.colors.length >= 6) return p
        return { ...p, colors: [...p.colors, { hex: '#888888', role }] }
      })
      persist({ ...state, customPalettes })
      return { customPalettes }
    })
  },

  removePaletteColor: (paletteId, colorIndex) => {
    set((state) => {
      const customPalettes = state.customPalettes.map((p) => {
        if (p.id !== paletteId) return p
        if (p.colors.length <= 3) return p
        return { ...p, colors: p.colors.filter((_, i) => i !== colorIndex) }
      })
      persist({ ...state, customPalettes })
      return { customPalettes }
    })
  },

  deletePalette: (id) => {
    const state = get()
    if (!state.customPalettes.some((p) => p.id === id)) return
    const remaining = state.customPalettes.filter((p) => p.id !== id)
    const nextPaletteId =
      state.params.paletteId === id ? state.presetPalettes[0].id : state.params.paletteId
    const nextParams = { ...state.params, paletteId: nextPaletteId }
    set(() => {
      persist({ ...state, customPalettes: remaining, params: nextParams })
      return { customPalettes: remaining, params: nextParams }
    })
  },

  setUploadedFont: (font) => {
    set((state) => {
      if (!font) {
        return {
          uploadedFont: null,
          params: { ...state.params, fontSource: 'system' },
        }
      }
      return {
        uploadedFont: font,
        params: {
          ...state.params,
          fontSource: { type: 'upload', name: font.name, data: new ArrayBuffer(0) },
          fontFamily: font.name,
        },
      }
    })
  },

  loadBundledFonts: async () => {
    const state = get()
    if (state.bundledFontStatus === 'loading' || state.bundledFontStatus === 'ready') return
    set({ bundledFontStatus: 'loading', bundledFontError: null })
    try {
      const ids: BundledFontId[] = ['inter', 'noto-sans-kr']
      const results = await Promise.all(
        ids.map(async (id) => [id, await fetchBundledFont(id)] as const),
      )
      const bundledFonts: Partial<Record<BundledFontId, opentype.Font>> = {}
      for (const [id, font] of results) bundledFonts[id] = font
      set({ bundledFonts, bundledFontStatus: 'ready' })
    } catch (e) {
      const msg = (e as Error).message ?? 'Font load failed'
      set({ bundledFontStatus: 'error', bundledFontError: msg })
    }
  },

  allPalettes: () => [...get().presetPalettes, ...get().customPalettes],
  getPalette: (id) =>
    get().presetPalettes.find((p) => p.id === id) ??
    get().customPalettes.find((p) => p.id === id),
}))
