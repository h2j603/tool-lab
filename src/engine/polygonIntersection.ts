import { Point } from './rockShape'

// Separating Axis Theorem — two convex polygons overlap iff no axis separates them.
// Polygons must be given in a consistent winding order (either CW or CCW; the
// normals point outward accordingly, but SAT only cares about projections).
export function polygonsIntersect(polyA: Point[], polyB: Point[]): boolean {
  return (
    !hasSeparatingAxis(polyA, polyA, polyB) &&
    !hasSeparatingAxis(polyB, polyA, polyB)
  )
}

function hasSeparatingAxis(source: Point[], polyA: Point[], polyB: Point[]): boolean {
  for (let i = 0; i < source.length; i++) {
    const p1 = source[i]
    const p2 = source[(i + 1) % source.length]
    const normal = { x: p2.y - p1.y, y: -(p2.x - p1.x) }
    const a = project(polyA, normal)
    const b = project(polyB, normal)
    if (a.max < b.min || b.max < a.min) return true
  }
  return false
}

function project(poly: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const p of poly) {
    const d = p.x * axis.x + p.y * axis.y
    if (d < min) min = d
    if (d > max) max = d
  }
  return { min, max }
}
