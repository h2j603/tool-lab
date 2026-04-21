import { NoiseFn } from './random'
import { RockParams as RockParamsType, RockPolygonData } from './types'

export type { RockParamsType as RockParams }

export interface Point {
  x: number
  y: number
}

export type RockPolygon = RockPolygonData

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

function computeCentroid(points: Point[]): Point {
  let a2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const cross = p.x * q.y - q.x * p.y
    a2 += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  if (a2 === 0) {
    // Degenerate polygon: average of vertices.
    let ax = 0
    let ay = 0
    for (const p of points) {
      ax += p.x
      ay += p.y
    }
    return { x: ax / points.length, y: ay / points.length }
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) }
}

export function boundingBoxOf(points: Point[]): {
  x: number; y: number; width: number; height: number
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function generateRock(
  centerX: number,
  centerY: number,
  baseRadius: number,
  layerIndex: number,
  rockParams: RockParamsType,
  noise: NoiseFn,
): RockPolygon {
  const { roughness, spikiness, vertexCount } = rockParams
  const freq = lerp(0.6, 3.5, spikiness)
  const angleOffset = layerIndex * 1000
  const points: Point[] = []

  for (let i = 0; i < vertexCount; i++) {
    const theta = (i / vertexCount) * Math.PI * 2
    // Periodic noise via cos/sin of θ so the polygon closes seamlessly.
    const nx = Math.cos(theta) * freq + angleOffset
    const ny = Math.sin(theta) * freq + angleOffset
    const nv = noise(nx, ny) // -1..1
    const r = baseRadius * (1 + nv * roughness)
    points.push({
      x: centerX + Math.cos(theta) * r,
      y: centerY + Math.sin(theta) * r,
    })
  }

  return {
    points,
    centerX,
    centerY,
    centroid: computeCentroid(points),
    boundingBox: boundingBoxOf(points),
  }
}

export function translateRock(rock: RockPolygon, dx: number, dy: number): RockPolygon {
  const points = rock.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
  return {
    points,
    centerX: rock.centerX + dx,
    centerY: rock.centerY + dy,
    centroid: { x: rock.centroid.x + dx, y: rock.centroid.y + dy },
    boundingBox: {
      x: rock.boundingBox.x + dx,
      y: rock.boundingBox.y + dy,
      width: rock.boundingBox.width,
      height: rock.boundingBox.height,
    },
  }
}

export function minDistanceFromPointToPolygonEdge(p: Point, poly: Point[]): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const len2 = abx * abx + aby * aby || 1
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
    t = Math.max(0, Math.min(1, t))
    const qx = a.x + abx * t
    const qy = a.y + aby * t
    const d = Math.hypot(p.x - qx, p.y - qy)
    if (d < best) best = d
  }
  return best
}
