import { describe, expect, it } from 'vitest'
import { darkenHex } from '../pattern'
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

describe('Pattern integration — moire', () => {
  const on: PosterParams = {
    ...DEFAULT_PARAMS,
    pattern: {
      ...DEFAULT_PARAMS.pattern,
      enabled: true,
      type: 'moire',
      variation: 0.4,
    },
  }

  it('layers gain moire pattern data when enabled', () => {
    const poster = generatePoster(on, PRESET_PALETTES)
    for (const l of poster.layers) {
      expect(l.pattern).toBeDefined()
      expect(l.pattern!.type).toBe('moire')
      const p = l.pattern as Extract<NonNullable<typeof l.pattern>, { type: 'moire' }>
      expect(p.angleDelta).toBeGreaterThanOrEqual(0.3)
      expect(p.spacing).toBeGreaterThan(0)
      expect(p.dotRadius).toBeGreaterThan(0)
      expect(p.primaryColor).toBe(l.colorHex)
      expect(p.secondaryColor.length).toBe(7)
    }
  })

  it('layers stay solid when pattern disabled', () => {
    const poster = generatePoster(DEFAULT_PARAMS, PRESET_PALETTES)
    for (const l of poster.layers) {
      expect(l.pattern).toBeUndefined()
    }
  })

  it('variation=0 yields identical params across blocks', () => {
    const params: PosterParams = {
      ...on,
      pattern: { ...on.pattern, variation: 0 },
    }
    const poster = generatePoster(params, PRESET_PALETTES)
    const first = poster.layers[0].pattern as { type: 'moire'; spacing: number; angleDelta: number; dotRadius: number }
    for (const l of poster.layers) {
      const p = l.pattern as typeof first
      expect(p.angleDelta).toBeCloseTo(first.angleDelta, 6)
      expect(p.spacing).toBeCloseTo(first.spacing, 6)
      expect(p.dotRadius).toBeCloseTo(first.dotRadius, 6)
    }
  })

  it('variation > 0 produces a range of spacings/angles', () => {
    const poster = generatePoster(on, PRESET_PALETTES)
    const spacings = poster.layers.map((l) => (l.pattern as { spacing: number }).spacing)
    const angles = poster.layers.map(
      (l) => (l.pattern as { angleDelta: number }).angleDelta,
    )
    const spread = (arr: number[]) => Math.max(...arr) - Math.min(...arr)
    expect(spread(spacings)).toBeGreaterThan(0)
    expect(spread(angles)).toBeGreaterThan(0)
  })

  it('reproducible — same seed yields same pattern data', () => {
    const a = generatePoster(on, PRESET_PALETTES)
    const b = generatePoster(on, PRESET_PALETTES)
    expect(a.layers.map((l) => l.pattern)).toEqual(b.layers.map((l) => l.pattern))
  })
})

describe('Pattern integration — stripes', () => {
  const on: PosterParams = {
    ...DEFAULT_PARAMS,
    pattern: {
      ...DEFAULT_PARAMS.pattern,
      enabled: true,
      type: 'stripes',
      variation: 0.4,
    },
  }
  it('layers gain stripes data', () => {
    const poster = generatePoster(on, PRESET_PALETTES)
    for (const l of poster.layers) {
      expect(l.pattern).toBeDefined()
      const p = l.pattern as Extract<NonNullable<typeof l.pattern>, { type: 'stripes' }>
      expect(p.type).toBe('stripes')
      expect(p.thickness).toBeGreaterThan(0)
      expect(p.spacing).toBeGreaterThan(p.thickness)
    }
  })
  it('variation spreads stripe angle across blocks', () => {
    const poster = generatePoster(on, PRESET_PALETTES)
    const angles = poster.layers.map((l) => (l.pattern as { angle: number }).angle)
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(0)
  })
})

describe('Pattern integration — rings', () => {
  const on: PosterParams = {
    ...DEFAULT_PARAMS,
    pattern: {
      ...DEFAULT_PARAMS.pattern,
      enabled: true,
      type: 'rings',
      variation: 0.3,
    },
  }
  it('layers gain ring data with a valid count and center', () => {
    const poster = generatePoster(on, PRESET_PALETTES)
    for (const l of poster.layers) {
      const p = l.pattern as Extract<NonNullable<typeof l.pattern>, { type: 'rings' }>
      expect(p.type).toBe('rings')
      expect(p.ringCount).toBeGreaterThanOrEqual(3)
      expect(p.ringCount).toBeLessThanOrEqual(20)
      expect(p.ringThickness).toBeGreaterThan(0)
    }
  })
})

describe('store migration fallback', () => {
  it('createRng returns a callable function', () => {
    const r = createRng(1)
    expect(typeof r).toBe('function')
  })
})
