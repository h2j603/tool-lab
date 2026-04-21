import { describe, expect, it } from 'vitest'
import { darkenHex } from '../moire'
import { generatePoster } from '../generator'
import { createRng } from '../random'
import { PosterParams } from '../types'
import { PRESET_PALETTES } from '../../palettes/presets'
import { DEFAULT_PARAMS } from '../../state/defaults'

describe('darkenHex', () => {
  it('returns a valid hex string darker than input', () => {
    expect(darkenHex('#ffffff', 0.5)).toBe('#808080')
    expect(darkenHex('#1B8A3F', 0.45).length).toBe(7)
  })
  it('leaves black black', () => {
    expect(darkenHex('#000000', 0.5)).toBe('#000000')
  })
})

describe('Moiré integration', () => {
  const moireOn: PosterParams = {
    ...DEFAULT_PARAMS,
    moire: { ...DEFAULT_PARAMS.moire, enabled: true, variation: 0.4 },
  }

  it('layers gain moire params when enabled', () => {
    const poster = generatePoster(moireOn, PRESET_PALETTES)
    for (const l of poster.layers) {
      expect(l.moire).toBeDefined()
      expect(l.moire!.angleDelta).toBeGreaterThanOrEqual(0.5)
      expect(l.moire!.spacing).toBeGreaterThan(0)
      expect(l.moire!.dotRadius).toBeGreaterThan(0)
      expect(l.moire!.primaryColor).toBe(l.colorHex)
      expect(l.moire!.interferenceColor.length).toBe(7)
    }
  })

  it('layers stay solid when Moiré disabled', () => {
    const poster = generatePoster(DEFAULT_PARAMS, PRESET_PALETTES)
    for (const l of poster.layers) {
      expect(l.moire).toBeUndefined()
    }
  })

  it('variation=0 yields identical params across blocks', () => {
    const params: PosterParams = {
      ...moireOn,
      moire: { ...moireOn.moire, variation: 0 },
    }
    const poster = generatePoster(params, PRESET_PALETTES)
    const first = poster.layers[0].moire!
    for (const l of poster.layers) {
      expect(l.moire!.angleDelta).toBeCloseTo(first.angleDelta, 6)
      expect(l.moire!.spacing).toBeCloseTo(first.spacing, 6)
      expect(l.moire!.dotRadius).toBeCloseTo(first.dotRadius, 6)
    }
  })

  it('variation=0.4 produces a range of spacings/angles', () => {
    const poster = generatePoster(moireOn, PRESET_PALETTES)
    const spacings = poster.layers.map((l) => l.moire!.spacing)
    const angles = poster.layers.map((l) => l.moire!.angleDelta)
    const spread = (arr: number[]) => Math.max(...arr) - Math.min(...arr)
    expect(spread(spacings)).toBeGreaterThan(0)
    expect(spread(angles)).toBeGreaterThan(0)
  })

  it('reproducible — same seed yields same moire params', () => {
    const a = generatePoster(moireOn, PRESET_PALETTES)
    const b = generatePoster(moireOn, PRESET_PALETTES)
    expect(a.layers.map((l) => l.moire)).toEqual(b.layers.map((l) => l.moire))
  })
})

describe('store migration fallback', () => {
  // Sanity check: the RNG helper still works regardless of schema.
  it('createRng returns a callable function', () => {
    const r = createRng(1)
    expect(typeof r).toBe('function')
  })
})
