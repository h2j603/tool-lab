import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS } from '../../state/defaults'
import { PRESET_PALETTES } from '../../palettes/presets'
import { generatePoster } from '../generator'
import { PosterParams } from '../types'

describe('circular blocks', () => {
  const circleParams: PosterParams = { ...DEFAULT_PARAMS, blockShape: 'circle', breathingRoom: 0 }

  it('all layers are circles with width === height', () => {
    const poster = generatePoster(circleParams, PRESET_PALETTES)
    expect(poster.layers.length).toBe(DEFAULT_PARAMS.layerCount)
    for (const l of poster.layers) {
      expect(l.shape).toBe('circle')
      expect(l.width).toBe(l.height)
      expect(l.rotation).toBe(0)
      expect(l.skew).toBe(0)
    }
  })

  it('every adjacent pair (by center y) overlaps — center distance < sum of radii', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const poster = generatePoster({ ...circleParams, seed }, PRESET_PALETTES)
      const ordered = [...poster.layers].sort(
        (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
      )
      for (let i = 1; i < ordered.length; i++) {
        const a = ordered[i - 1]
        const b = ordered[i]
        const ax = a.x + a.width / 2
        const ay = a.y + a.height / 2
        const bx = b.x + b.width / 2
        const by = b.y + b.height / 2
        const dist = Math.hypot(bx - ax, by - ay)
        const sumRadii = (a.width + b.width) / 2
        expect(dist).toBeLessThan(sumRadii)
      }
    }
  })
})
