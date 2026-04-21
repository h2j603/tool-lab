import { GlyphRegion, Point, pointInPolygon } from './glyphRegions'
import { AllocationStrategy, BlockShape, Layer } from './types'

export type { AllocationStrategy }

// Distribute `totalBlocks` across the regions. Every region gets at least 1.
// Deterministic: regions earlier in the array catch remainders / min-1 upweighting.
export function allocateBlocksToRegions(
  totalBlocks: number,
  regions: GlyphRegion[],
  strategy: AllocationStrategy,
): Map<string, number> {
  const out = new Map<string, number>()
  const n = regions.length
  if (n === 0) return out

  // Caller should already have upscaled totalBlocks to at least n so every
  // region can get one, but we still guard here.
  const total = Math.max(totalBlocks, n)

  const keyOf = (i: number) => regions[i].points.length
    ? `region-${i}`
    : `region-${i}`

  if (strategy === 'even') {
    const per = Math.floor(total / n)
    const remainder = total - per * n
    regions.forEach((_, i) => {
      out.set(keyOf(i), per + (i < remainder ? 1 : 0))
    })
    return out
  }

  // 'area' — proportional allocation with a minimum of 1 per region.
  const totalArea = regions.reduce((s, r) => s + r.area, 0)
  if (totalArea <= 0) {
    // Degenerate — fall back to even
    return allocateBlocksToRegions(total, regions, 'even')
  }
  const raw = regions.map((r) => (r.area / totalArea) * total)
  // Floor then bump small regions up to 1.
  const allocs = raw.map((v) => Math.max(1, Math.floor(v)))
  let assigned = allocs.reduce((a, b) => a + b, 0)

  // Distribute the remaining slots to the regions whose fractional part is
  // largest — standard largest-remainder method.
  if (assigned < total) {
    const fractions = raw
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    let k = 0
    while (assigned < total && k < fractions.length) {
      allocs[fractions[k].i] += 1
      assigned++
      k++
      if (k === fractions.length) k = 0 // wrap if somehow still short
    }
  }
  // If we overshot (because of min-1 bumps) remove from the largest buckets
  // that have more than 1.
  while (assigned > total) {
    let largest = -1
    let largestVal = -Infinity
    for (let i = 0; i < allocs.length; i++) {
      if (allocs[i] > 1 && allocs[i] > largestVal) {
        largest = i
        largestVal = allocs[i]
      }
    }
    if (largest === -1) break
    allocs[largest] -= 1
    assigned -= 1
  }

  regions.forEach((_, i) => out.set(keyOf(i), allocs[i]))
  return out
}

// Helper: layer's center point on canvas, regardless of shape.
export function layerCenter(layer: Layer): Point {
  return { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 }
}

function layerMinDim(layer: Layer): number {
  return Math.min(layer.width, layer.height)
}

function translateLayer(layer: Layer, dx: number, dy: number): Layer {
  return { ...layer, x: layer.x + dx, y: layer.y + dy }
}

// Distance from point to a polygon edge, and the nearest point on that edge.
// Returns { distance, point } for the closest edge overall.
export function nearestPointOnPolygonEdge(
  p: Point,
  poly: Point[],
): { distance: number; point: Point } {
  let best = { distance: Infinity, point: poly[0] }
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const ap = { x: p.x - a.x, y: p.y - a.y }
    const ab = { x: b.x - a.x, y: b.y - a.y }
    const abLen2 = ab.x * ab.x + ab.y * ab.y || 1
    let t = (ap.x * ab.x + ap.y * ab.y) / abLen2
    t = Math.max(0, Math.min(1, t))
    const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t }
    const dx = p.x - closest.x
    const dy = p.y - closest.y
    const dist = Math.hypot(dx, dy)
    if (dist < best.distance) best = { distance: dist, point: closest }
  }
  return best
}

// Constrain layers so each layer's center sits inside the region's polygon.
// Tolerance (0..1) allows the center to sit up to `tolerance * minDim` outside
// the polygon. Layers beyond tolerance get pulled to the nearest edge point.
export function constrainLayersToRegion(
  layers: Layer[],
  region: GlyphRegion,
  tolerance: number,
  _shape: BlockShape,
): Layer[] {
  return layers.map((layer) => {
    const center = layerCenter(layer)
    if (pointInPolygon(center, region.points)) return layer

    const { distance, point } = nearestPointOnPolygonEdge(center, region.points)
    const slack = tolerance * layerMinDim(layer)
    if (distance <= slack) return layer

    // Pull the center onto the polygon edge.
    const dx = point.x - center.x
    const dy = point.y - center.y
    return translateLayer(layer, dx, dy)
  })
}
