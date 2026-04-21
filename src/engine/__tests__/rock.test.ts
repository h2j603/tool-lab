import { describe, expect, it } from 'vitest'
import { generateRock } from '../rockShape'
import { polygonsIntersect } from '../polygonIntersection'
import { createNoise2D } from '../random'
import { generatePoster } from '../generator'
import { PRESET_PALETTES } from '../../palettes/presets'
import { DEFAULT_PARAMS } from '../../state/defaults'

describe('generateRock', () => {
  const noise = createNoise2D(1)
  it('produces `vertexCount` points and a seamless polygon', () => {
    const rock = generateRock(100, 100, 40, 0, { roughness: 0.2, spikiness: 0.3, vertexCount: 24 }, noise)
    expect(rock.points.length).toBe(24)
    expect(rock.boundingBox.width).toBeGreaterThan(0)
    expect(rock.boundingBox.height).toBeGreaterThan(0)
    // Centroid should be roughly near the requested center.
    expect(Math.abs(rock.centroid.x - 100)).toBeLessThan(15)
    expect(Math.abs(rock.centroid.y - 100)).toBeLessThan(15)
  })

  it('changes shape by layerIndex offset', () => {
    const a = generateRock(0, 0, 40, 0, { roughness: 0.3, spikiness: 0.3, vertexCount: 24 }, noise)
    const b = generateRock(0, 0, 40, 5, { roughness: 0.3, spikiness: 0.3, vertexCount: 24 }, noise)
    expect(a.points).not.toEqual(b.points)
  })
})

describe('SAT polygonsIntersect', () => {
  const unitSquare = (cx: number, cy: number, size: number) => [
    { x: cx - size, y: cy - size },
    { x: cx + size, y: cy - size },
    { x: cx + size, y: cy + size },
    { x: cx - size, y: cy + size },
  ]
  it('detects overlapping squares', () => {
    expect(polygonsIntersect(unitSquare(0, 0, 5), unitSquare(3, 0, 5))).toBe(true)
  })
  it('detects separated squares', () => {
    expect(polygonsIntersect(unitSquare(0, 0, 5), unitSquare(20, 0, 5))).toBe(false)
  })
  it('detects diagonal separation', () => {
    expect(polygonsIntersect(unitSquare(0, 0, 5), unitSquare(30, 30, 5))).toBe(false)
  })
  it('detects touching-edge as overlapping (projections meet)', () => {
    expect(polygonsIntersect(unitSquare(0, 0, 5), unitSquare(10, 0, 5))).toBe(true)
  })
})

describe('Rock chain integration', () => {
  it('adjacent rock pairs overlap after generation', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const poster = generatePoster(
        { ...DEFAULT_PARAMS, seed, blockShape: 'rock' },
        PRESET_PALETTES,
      )
      const ordered = [...poster.layers].sort(
        (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
      )
      for (let i = 1; i < ordered.length; i++) {
        const a = ordered[i - 1].polygon!
        const b = ordered[i].polygon!
        expect(polygonsIntersect(a.points, b.points)).toBe(true)
      }
    }
  })

  it('layers carry polygon data for rock shape', () => {
    const poster = generatePoster(
      { ...DEFAULT_PARAMS, blockShape: 'rock' },
      PRESET_PALETTES,
    )
    for (const l of poster.layers) {
      expect(l.shape).toBe('rock')
      expect(l.polygon).toBeDefined()
      expect(l.rotation).toBe(0)
      expect(l.skew).toBe(0)
    }
  })
})
