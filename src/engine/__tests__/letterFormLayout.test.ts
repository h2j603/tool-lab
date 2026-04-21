import { describe, expect, it } from 'vitest'
import {
  allocateBlocksToRegions,
  constrainLayersToRegion,
  nearestPointOnPolygonEdge,
} from '../letterFormLayout'
import { GlyphRegion } from '../glyphRegions'
import { Layer } from '../types'

function makeRegion(id: string, area: number, polyOverride?: { x: number; y: number }[]): GlyphRegion {
  // Default region: a unit square scaled so its "area" reading matches.
  const side = Math.sqrt(area)
  const points = polyOverride ?? [
    { x: 0, y: 0 },
    { x: side, y: 0 },
    { x: side, y: side },
    { x: 0, y: side },
  ]
  return {
    points,
    boundingBox: { x: 0, y: 0, width: side, height: side },
    area,
    centroid: { x: side / 2, y: side / 2 },
    // id is not part of GlyphRegion but useful for test debugging
    ...({ id } as {}),
  }
}

describe('allocateBlocksToRegions', () => {
  it('area strategy distributes proportionally with min 1 per region', () => {
    const regions = [makeRegion('big', 1000), makeRegion('mid', 500), makeRegion('tiny', 50)]
    const out = allocateBlocksToRegions(10, regions, 'area')
    const values = [...out.values()]
    expect(values.reduce((a, b) => a + b, 0)).toBe(10)
    values.forEach((v) => expect(v).toBeGreaterThanOrEqual(1))
    expect(values[0]).toBeGreaterThan(values[1])
    expect(values[1]).toBeGreaterThan(values[2])
  })

  it('even strategy distributes roughly equally', () => {
    const regions = [makeRegion('a', 100), makeRegion('b', 100), makeRegion('c', 100)]
    const out = allocateBlocksToRegions(7, regions, 'even')
    const values = [...out.values()]
    expect(values.reduce((a, b) => a + b, 0)).toBe(7)
    // 3 + 2 + 2 expected
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it('raises total to match region count when caller under-provisioned', () => {
    const regions = [makeRegion('a', 1), makeRegion('b', 1), makeRegion('c', 1)]
    const out = allocateBlocksToRegions(2, regions, 'area')
    const total = [...out.values()].reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThanOrEqual(3)
  })

  it('allocates "4 blocks across 3 regions" with each getting at least 1', () => {
    const regions = [makeRegion('a', 300), makeRegion('b', 200), makeRegion('c', 100)]
    const out = allocateBlocksToRegions(4, regions, 'area')
    const values = [...out.values()]
    expect(values.reduce((a, b) => a + b, 0)).toBe(4)
    values.forEach((v) => expect(v).toBeGreaterThanOrEqual(1))
    // Largest region should get the spillover block.
    expect(values[0]).toBeGreaterThanOrEqual(values[1])
  })
})

describe('nearestPointOnPolygonEdge', () => {
  it('returns the projection when the point lies outside a convex shape', () => {
    const poly = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ]
    const { point, distance } = nearestPointOnPolygonEdge({ x: 15, y: 5 }, poly)
    expect(point.x).toBeCloseTo(10, 6)
    expect(point.y).toBeCloseTo(5, 6)
    expect(distance).toBeCloseTo(5, 6)
  })
})

describe('constrainLayersToRegion', () => {
  const region: GlyphRegion = {
    points: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    ],
    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
    area: 10000,
    centroid: { x: 50, y: 50 },
  }
  const makeLayer = (x: number, y: number): Layer => ({
    id: 'L', shape: 'rectangle',
    x, y, width: 20, height: 20,
    rotation: 0, skew: 0, colorHex: '#000', area: 400,
  })

  it('leaves layers inside the region unchanged', () => {
    const layers = [makeLayer(10, 10), makeLayer(70, 60)]
    const out = constrainLayersToRegion(layers, region, 0, 'rectangle')
    expect(out[0].x).toBe(10)
    expect(out[1].x).toBe(70)
  })

  it('pulls layers outside the region to the nearest edge', () => {
    // Center at (150, 50) — far right of the region box (100)
    const layer = makeLayer(140, 40) // center (150, 50)
    const out = constrainLayersToRegion([layer], region, 0, 'rectangle')
    // Center should snap to (100, 50) → top-left x becomes 90
    expect(out[0].x).toBe(90)
    expect(out[0].y).toBe(40)
  })

  it('respects tolerance so near-edge layers are allowed', () => {
    // Center at (105, 50), minDim=20. Tolerance 0.5 → allowed slack 10.
    // Distance from (105,50) to region edge = 5 → within tolerance → untouched.
    const layer = makeLayer(95, 40)
    const out = constrainLayersToRegion([layer], region, 0.5, 'rectangle')
    expect(out[0].x).toBe(95)
  })
})
