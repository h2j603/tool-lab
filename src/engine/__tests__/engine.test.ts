import { describe, expect, it } from 'vitest'
import { assignColorsByWeight } from '../color'
import {
  enforceVerticalChain,
  generateWeightedSizes,
  PROPORTION_SETS,
  pickProportions,
} from '../composition'
import { generatePoster } from '../generator'
import { createRng } from '../random'
import { Layer, PosterParams } from '../types'
import { PRESET_PALETTES } from '../../palettes/presets'
import { DEFAULT_PARAMS } from '../../state/defaults'

describe('generateWeightedSizes', () => {
  it('returns count values with variance when experimental is off', () => {
    const sizes = generateWeightedSizes(5, createRng(1), false)
    expect(sizes.length).toBe(5)
    const distinct = new Set(sizes).size
    expect(distinct).toBeGreaterThan(1)
  })

  it('is deterministic', () => {
    const a = generateWeightedSizes(5, createRng(7), false)
    const b = generateWeightedSizes(5, createRng(7), false)
    expect(a).toEqual(b)
  })
})

describe('pickProportions', () => {
  it('draws only from the proportion set when experimental off', () => {
    const ratios = pickProportions(10, 'classical', createRng(2), false)
    const allowed = new Set([
      ...PROPORTION_SETS.classical,
      ...PROPORTION_SETS.classical.map((v) => 1 / v),
    ])
    const close = (a: number) => [...allowed].some((b) => Math.abs(a - b) < 1e-6)
    ratios.forEach((r) => expect(close(r)).toBe(true))
  })

  it('classical set no longer contains the 5:1 extreme', () => {
    expect(PROPORTION_SETS.classical.includes(5)).toBe(false)
  })
})

describe('assignColorsByWeight', () => {
  it('assigns dominant to largest and accent to smallest', () => {
    const layers: Layer[] = [
      { id: 'a', x: 0, y: 0, width: 100, height: 100, rotation: 0, skew: 0, colorHex: '', area: 10000 },
      { id: 'b', x: 0, y: 0, width: 50, height: 50, rotation: 0, skew: 0, colorHex: '', area: 2500 },
      { id: 'c', x: 0, y: 0, width: 20, height: 20, rotation: 0, skew: 0, colorHex: '', area: 400 },
    ]
    const palette = PRESET_PALETTES[0]
    const result = assignColorsByWeight(layers, palette)
    const byId = new Map(result.map((l) => [l.id, l.colorHex]))
    expect(byId.get('a')).toBe(palette.colors.find((c) => c.role === 'dominant')!.hex)
    expect(byId.get('c')).toBe(palette.colors.find((c) => c.role === 'accent')!.hex)
  })
})

describe('enforceVerticalChain', () => {
  it('every adjacent pair overlaps after enforcement with breathingRoom=0', () => {
    const layers: Layer[] = [
      { id: 'a', x: 0, y: 0,   width: 80, height: 50, rotation: 0, skew: 0, colorHex: '', area: 4000 },
      { id: 'b', x: 0, y: 200, width: 80, height: 50, rotation: 0, skew: 0, colorHex: '', area: 4000 },
      { id: 'c', x: 0, y: 400, width: 80, height: 50, rotation: 0, skew: 0, colorHex: '', area: 4000 },
    ]
    const out = enforceVerticalChain(layers, 0.2, 0, createRng(1))
    for (let i = 1; i < out.length; i++) {
      const prevBottom = out[i - 1].y + out[i - 1].height
      const currTop = out[i].y
      expect(currTop).toBeLessThan(prevBottom) // negative gap means overlap
    }
  })

  it('deterministic for a given seed', () => {
    const layers: Layer[] = [
      { id: 'a', x: 0, y: 0,   width: 80, height: 50, rotation: 0, skew: 0, colorHex: '', area: 4000 },
      { id: 'b', x: 0, y: 200, width: 80, height: 50, rotation: 0, skew: 0, colorHex: '', area: 4000 },
    ]
    const a = enforceVerticalChain(layers, 0.2, 0, createRng(5))
    const b = enforceVerticalChain(layers, 0.2, 0, createRng(5))
    expect(a.map((l) => l.y)).toEqual(b.map((l) => l.y))
  })
})

describe('generatePoster', () => {
  it('produces reproducible output for the same seed', () => {
    const a = generatePoster(DEFAULT_PARAMS, PRESET_PALETTES)
    const b = generatePoster(DEFAULT_PARAMS, PRESET_PALETTES)
    expect(a.layers).toEqual(b.layers)
    expect(a.typeBlocks).toEqual(b.typeBlocks)
  })

  it('throws when palette id is unknown', () => {
    const params: PosterParams = { ...DEFAULT_PARAMS, paletteId: 'does-not-exist' }
    expect(() => generatePoster(params, PRESET_PALETTES)).toThrow()
  })

  it('no floating layers — every adjacent pair overlaps with breathingRoom=0', () => {
    const params: PosterParams = { ...DEFAULT_PARAMS, breathingRoom: 0 }
    const rotatedBounds = (l: Layer) => {
      const cy = l.y + l.height / 2
      const theta = (l.rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(theta))
      const cos = Math.abs(Math.cos(theta))
      const halfH = (l.width * sin + l.height * cos) / 2
      return { top: cy - halfH, bottom: cy + halfH }
    }
    for (let seed = 1; seed <= 20; seed++) {
      const poster = generatePoster({ ...params, seed }, PRESET_PALETTES)
      const ordered = [...poster.layers].sort(
        (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
      )
      for (let i = 1; i < ordered.length; i++) {
        const prev = rotatedBounds(ordered[i - 1])
        const curr = rotatedBounds(ordered[i])
        const gap = curr.top - prev.bottom
        expect(gap).toBeLessThan(0)
      }
    }
  })

  it('no sliver layers — smallest side >= MIN_SIDE_RATIO * base', () => {
    const params: PosterParams = { ...DEFAULT_PARAMS, proportionSet: 'extreme' }
    for (let seed = 1; seed <= 20; seed++) {
      const poster = generatePoster({ ...params, seed }, PRESET_PALETTES)
      const minAllowed = poster.canvasHeight * params.baseSize * 0.25
      for (const l of poster.layers) {
        expect(Math.min(l.width, l.height)).toBeGreaterThanOrEqual(minAllowed - 1e-6)
      }
    }
  })
})
