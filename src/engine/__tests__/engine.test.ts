import { describe, expect, it } from 'vitest'
import { assignColorsByWeight } from '../color'
import {
  enforceOverlap,
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

describe('enforceOverlap', () => {
  it('moves isolated layers closer', () => {
    const layers: Layer[] = [
      { id: 'a', x: 0, y: 0, width: 50, height: 50, rotation: 0, skew: 0, colorHex: '', area: 2500 },
      { id: 'b', x: 200, y: 200, width: 50, height: 50, rotation: 0, skew: 0, colorHex: '', area: 2500 },
    ]
    const result = enforceOverlap(layers, 0.5)
    const movedA = result[0]
    expect(movedA.x).not.toBe(0)
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
})
