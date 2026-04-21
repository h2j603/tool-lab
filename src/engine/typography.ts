import { RNG, rngRange } from './random'
import { Layer, PosterParams, TypeBlock } from './types'

export function placeTypeBlocks(
  layers: Layer[],
  params: PosterParams,
  rng: RNG,
): TypeBlock[] {
  const lines = params.text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0 || layers.length === 0) return []

  const placement = params.experimental.enabled
    ? params.typePlacement
    : 'boundary-cross'

  if (placement === 'single-layer') return singleLayer(lines, layers, params)
  if (placement === 'scattered') return scattered(lines, layers, params, rng)
  return boundaryCross(lines, layers, params, rng)
}

function sortedByY(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2))
}

function fontSizeFromLayer(layer: Layer, params: PosterParams): number {
  return Math.max(4, layer.width * params.textSize)
}

// Rule F — place each text block so its vertical center crosses a layer boundary.
function boundaryCross(
  lines: string[],
  layers: Layer[],
  params: PosterParams,
  rng: RNG,
): TypeBlock[] {
  const ordered = sortedByY(layers)
  if (ordered.length < 2) return singleLayer(lines, layers, params)

  // Group lines into blocks of 1-3 consecutive lines.
  const blocks = groupLines(lines)
  const boundaries = findBoundaries(ordered)
  const result: TypeBlock[] = []

  blocks.forEach((block, i) => {
    const boundaryIdx = boundaries.length > 0 ? i % boundaries.length : 0
    const { upper, lower, y } = boundaries[boundaryIdx] ?? {
      upper: ordered[0],
      lower: ordered[1],
      y: ordered[0].y + ordered[0].height,
    }
    const bigger = upper.area >= lower.area ? upper : lower
    const fontSize = fontSizeFromLayer(bigger, params)
    const lineHeight = fontSize * 1.1
    const totalHeight = lineHeight * block.length
    const startY = y - totalHeight / 2 + lineHeight * 0.8

    const sideNear = rng() < 0.5 ? 'start' : 'end'
    const xOffsetNoise = rngRange(rng, -0.05, 0.05) * bigger.width
    const x =
      sideNear === 'start'
        ? bigger.x + bigger.width * 0.08 + xOffsetNoise
        : bigger.x + bigger.width * 0.92 + xOffsetNoise

    block.forEach((text, li) => {
      result.push({
        id: `type-${i}-${li}`,
        text,
        x,
        y: startY + lineHeight * li,
        rotation: bigger.rotation,
        fontSize,
        fontFamily: params.fontFamily,
        anchor: sideNear === 'start' ? 'start' : 'end',
      })
    })
  })

  return result
}

function singleLayer(
  lines: string[],
  layers: Layer[],
  params: PosterParams,
): TypeBlock[] {
  const biggest = [...layers].sort((a, b) => b.area - a.area)[0]
  if (!biggest) return []
  const fontSize = fontSizeFromLayer(biggest, params)
  const lineHeight = fontSize * 1.1
  const startY = biggest.y + biggest.height * 0.4
  return lines.map((text, i) => ({
    id: `type-single-${i}`,
    text,
    x: biggest.x + biggest.width * 0.5,
    y: startY + lineHeight * i,
    rotation: biggest.rotation,
    fontSize,
    fontFamily: params.fontFamily,
    anchor: 'middle' as const,
  }))
}

function scattered(
  lines: string[],
  layers: Layer[],
  params: PosterParams,
  rng: RNG,
): TypeBlock[] {
  const ordered = sortedByY(layers)
  const boundaries = findBoundaries(ordered)
  if (boundaries.length === 0) return singleLayer(lines, layers, params)
  return lines.map((text, i) => {
    const { upper, lower, y } = boundaries[i % boundaries.length]
    const bigger = upper.area >= lower.area ? upper : lower
    const fontSize = fontSizeFromLayer(bigger, params)
    const xOffset = rngRange(rng, 0.1, 0.9) * bigger.width
    return {
      id: `type-scattered-${i}`,
      text,
      x: bigger.x + xOffset,
      y,
      rotation: bigger.rotation,
      fontSize,
      fontFamily: params.fontFamily,
      anchor: 'start' as const,
    }
  })
}

interface Boundary {
  upper: Layer
  lower: Layer
  y: number // overlap-zone center
}

function findBoundaries(ordered: Layer[]): Boundary[] {
  const out: Boundary[] = []
  for (let i = 0; i < ordered.length - 1; i++) {
    const upper = ordered[i]
    const lower = ordered[i + 1]
    const upperBottom = upper.y + upper.height
    const lowerTop = lower.y
    // Mid of the overlap region (if any) or the gap center.
    const y = (upperBottom + lowerTop) / 2
    out.push({ upper, lower, y })
  }
  return out
}

function groupLines(lines: string[]): string[][] {
  if (lines.length <= 3) return [lines]
  // Split roughly in half.
  const mid = Math.ceil(lines.length / 2)
  return [lines.slice(0, mid), lines.slice(mid)]
}
