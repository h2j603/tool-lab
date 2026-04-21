import opentype from 'opentype.js'

export interface Point {
  x: number
  y: number
}

export interface GlyphRegion {
  points: Point[]
  boundingBox: { x: number; y: number; width: number; height: number }
  area: number          // absolute polygon area
  centroid: Point
}

export interface ExtractOptions {
  curveSamples?: number // segments per Bezier, default 12
}

// Flatten an opentype.js path into closed sub-paths (polygons).
export function flattenPathToSubpaths(
  path: opentype.Path,
  curveSamples = 12,
): Point[][] {
  const subpaths: Point[][] = []
  let current: Point[] = []
  let lastX = 0
  let lastY = 0
  let startX = 0
  let startY = 0

  const pushSubpath = () => {
    if (current.length > 0) {
      // Drop duplicate-last-point closure; polygon operations treat it as closed.
      const first = current[0]
      const last = current[current.length - 1]
      if (first.x === last.x && first.y === last.y && current.length > 1) {
        current.pop()
      }
      subpaths.push(current)
      current = []
    }
  }

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        pushSubpath()
        current = [{ x: cmd.x, y: cmd.y }]
        lastX = cmd.x
        lastY = cmd.y
        startX = cmd.x
        startY = cmd.y
        break
      case 'L':
        current.push({ x: cmd.x, y: cmd.y })
        lastX = cmd.x
        lastY = cmd.y
        break
      case 'C': {
        for (let i = 1; i <= curveSamples; i++) {
          const t = i / curveSamples
          current.push(cubicBezier(lastX, lastY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y, t))
        }
        lastX = cmd.x
        lastY = cmd.y
        break
      }
      case 'Q': {
        for (let i = 1; i <= curveSamples; i++) {
          const t = i / curveSamples
          current.push(quadBezier(lastX, lastY, cmd.x1, cmd.y1, cmd.x, cmd.y, t))
        }
        lastX = cmd.x
        lastY = cmd.y
        break
      }
      case 'Z':
        // Line back to subpath start, then close
        lastX = startX
        lastY = startY
        pushSubpath()
        break
    }
  }
  pushSubpath()
  return subpaths
}

function cubicBezier(
  x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number,
  t: number,
): Point {
  const u = 1 - t
  const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
  const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
  return { x, y }
}

function quadBezier(
  x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, t: number,
): Point {
  const u = 1 - t
  const x = u * u * x0 + 2 * u * t * x1 + t * t * x2
  const y = u * u * y0 + 2 * u * t * y1 + t * t * y2
  return { x, y }
}

// Shoelace signed area. In SVG Y-down coords:
//   positive  → clockwise traversal (outer contour for TTF glyphs)
//   negative  → counter-clockwise (inner hole)
export function signedArea(points: Point[]): number {
  let s = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    s += p.x * q.y - q.x * p.y
  }
  return s / 2
}

export function boundingBox(points: Point[]): {
  x: number; y: number; width: number; height: number
} {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function centroid(points: Point[]): Point {
  // Area-weighted centroid using the standard polygon centroid formula.
  let cx = 0, cy = 0, a2 = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
    a2 += cross
  }
  if (a2 === 0) {
    // Degenerate — fall back to bounding-box center.
    const bb = boundingBox(points)
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) }
}

export function extractGlyphRegions(
  font: opentype.Font,
  text: string,
  targetGlyphHeightMm: number,
  canvasWidth: number,
  canvasHeight: number,
  opts: ExtractOptions = {},
): GlyphRegion[] {
  const curveSamples = opts.curveSamples ?? 12

  const path = font.getPath(text, 0, 0, 1000)
  const subpaths = flattenPathToSubpaths(path, curveSamples)
  if (subpaths.length === 0) return []

  // Classify each subpath as outer or hole by centroid containment — robust
  // across fonts using either nonzero (opposite winding) or even-odd (same
  // winding) fill rules. A subpath is a hole iff its centroid lies inside
  // another subpath. Remaining outers become regions.
  const classified = subpaths.map((points) => ({
    points,
    area: Math.abs(signedArea(points)),
    centroid: centroid(points),
  }))
  // Sort so the largest candidates get considered first.
  classified.sort((a, b) => b.area - a.area)

  const outers: typeof classified = []
  for (const sp of classified) {
    const isHoleOf = outers.some((o) => pointInPolygon(sp.centroid, o.points))
    if (!isHoleOf) outers.push(sp)
  }
  if (outers.length === 0) return []

  // Combined bounding box across ALL subpaths so hole-containing letters still
  // center correctly. Target: glyph occupies `targetGlyphHeightMm` vertically,
  // horizontally centered on the canvas.
  const allPoints = subpaths.flat()
  const overall = boundingBox(allPoints)
  if (overall.height === 0 || overall.width === 0) return []

  const scale = targetGlyphHeightMm / overall.height
  const scaledWidth = overall.width * scale
  const offsetX = (canvasWidth - scaledWidth) / 2 - overall.x * scale
  const offsetY = (canvasHeight - targetGlyphHeightMm) / 2 - overall.y * scale

  return outers.map((o) => {
    const transformed = o.points.map((p) => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    }))
    return {
      points: transformed,
      boundingBox: boundingBox(transformed),
      area: Math.abs(signedArea(transformed)),
      centroid: centroid(transformed),
    }
  })
}

// Point-in-polygon (ray casting). Works for simple polygons.
export function pointInPolygon(point: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}
