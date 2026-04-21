import { polygonsIntersect } from './polygonIntersection'
import { NoiseFn, RNG, noise1D, shuffle } from './random'
import { generateRock, translateRock } from './rockShape'
import { Layer, PosterParams, ProportionSet } from './types'

export const PROPORTION_SETS: Record<ProportionSet, number[]> = {
  classical: [1, Math.SQRT2, 1.618, 2, 3],
  extreme: [1, 2, 3, 5, 7],
  balanced: [1, Math.SQRT2, 2],
}

const FIBONACCI_WEIGHTS = [1, 2, 3, 5, 8, 13, 21]

const MIN_SIDE_RATIO = 0.25

export function generateWeightedSizes(
  count: number,
  rng: RNG,
  experimentalEqualSizes: boolean,
): number[] {
  if (count <= 0) return []

  if (experimentalEqualSizes) {
    return Array.from({ length: count }, () => 0.8 + (rng() - 0.5) * 0.2)
  }

  const base = FIBONACCI_WEIGHTS.slice(0, count)
  const total = base.reduce((a, b) => a + b, 0)
  const max = base[base.length - 1]
  const normalized = base.map((w) => w / max)
  const floored = normalized.map((v) => Math.max(0.12, v))
  const sum = floored.reduce((a, b) => a + b, 0)
  const scale = total / max / sum
  const sized = floored.map((v) => Math.min(1, v * scale))
  return shuffle(sized, rng)
}

export function pickProportions(
  count: number,
  set: ProportionSet,
  rng: RNG,
  experimentalFree: boolean,
): number[] {
  if (experimentalFree) {
    return Array.from({ length: count }, () => 0.6 + rng() * 1.9)
  }
  const pool = PROPORTION_SETS[set]
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const ratio = pool[Math.floor(rng() * pool.length)]
    result.push(rng() < 0.3 ? 1 / ratio : ratio)
  }
  return result
}

export function computeAxisJitter(
  i: number,
  coherence: number,
  noise: NoiseFn,
  maxJitterMm: number,
): number {
  const phase = Math.PI / 2
  const sineValue = Math.sin(i * Math.PI + phase)
  const noiseValue = noise(i * 0.4, 0)
  const blended = sineValue * 0.7 + noiseValue * 0.3
  return blended * (1 - coherence) * maxJitterMm
}

export function enforceMinSideLength(
  layers: Layer[],
  baseSize: number,
  canvasHeight: number,
): Layer[] {
  const minSide = canvasHeight * baseSize * MIN_SIDE_RATIO
  return layers.map((l) => {
    const minCurrent = Math.min(l.width, l.height)
    if (minCurrent >= minSide) return l
    const scale = minSide / minCurrent
    const width = l.width * scale
    const height = l.height * scale
    return {
      ...l,
      width,
      height,
      x: l.x - (width - l.width) / 2,
      y: l.y - (height - l.height) / 2,
      area: width * height,
    }
  })
}

function placeRectangleLayers(
  sizes: number[],
  proportions: number[],
  params: PosterParams,
  noise: NoiseFn,
  canvasWidth: number,
  canvasHeight: number,
): Layer[] {
  const count = sizes.length
  const baseMax = params.baseSize * canvasHeight

  const tentative: { w: number; h: number }[] = []
  let totalHeight = 0
  for (let i = 0; i < count; i++) {
    const weight = sizes[i]
    const ratio = proportions[i]
    let w: number
    let h: number
    if (ratio >= 1) {
      w = baseMax * weight
      h = w / ratio
    } else {
      h = baseMax * weight
      w = h * ratio
    }
    w = Math.min(w, canvasWidth * 0.95)
    h = Math.min(h, canvasHeight * 0.6)
    tentative.push({ w, h })
    totalHeight += h
  }

  const targetStackHeight = canvasHeight * 0.85
  const stackScale = totalHeight > targetStackHeight ? targetStackHeight / totalHeight : 1
  for (const t of tentative) {
    t.w *= stackScale
    t.h *= stackScale
  }

  const finalStackHeight = tentative.reduce((a, t) => a + t.h, 0)
  const gapCount = Math.max(1, count - 1)
  const rawGap = (canvasHeight - finalStackHeight) / (gapCount + 2)
  const gap = rawGap - Math.min(tentative[0].h * 0.15, 20)

  let cursorY = (canvasHeight - (finalStackHeight + gap * gapCount)) / 2
  const maxJitterMm = canvasWidth * 0.15
  const layers: Layer[] = []

  for (let i = 0; i < count; i++) {
    const { w, h } = tentative[i]
    const xJitter = computeAxisJitter(i, params.coherence, noise, maxJitterMm)
    const localRot = noise1D(noise, i + 100, 0.5) * params.localVariation
    const rotation = params.globalTilt + localRot

    layers.push({
      id: `layer-${i}`,
      shape: 'rectangle',
      x: (canvasWidth - w) / 2 + xJitter,
      y: cursorY,
      width: w,
      height: h,
      rotation,
      skew: params.skew,
      colorHex: '#000000',
      area: w * h,
    })
    cursorY += h + gap
  }

  return layers
}

function placeRockLayers(
  sizes: number[],
  params: PosterParams,
  noise: NoiseFn,
  canvasWidth: number,
  canvasHeight: number,
): Layer[] {
  const count = sizes.length
  const baseMax = params.baseSize * canvasHeight

  // Treat each rock as a noisy circle of radius baseMax*weight/2.
  const radii = sizes.map((w) => Math.min(
    (baseMax * w) / 2,
    (canvasWidth * 0.95) / 2,
    (canvasHeight * 0.6) / 2,
  ))

  const totalHeight = radii.reduce((a, r) => a + r * 2, 0)
  const target = canvasHeight * 0.85
  const stackScale = totalHeight > target ? target / totalHeight : 1
  const scaled = radii.map((r) => r * stackScale)

  const finalHeight = scaled.reduce((a, r) => a + r * 2, 0)
  const gapCount = Math.max(1, count - 1)
  const rawGap = (canvasHeight - finalHeight) / (gapCount + 2)
  const gap = rawGap - Math.min(scaled[0] * 0.15, 20)

  let cursorY = (canvasHeight - (finalHeight + gap * gapCount)) / 2 + scaled[0]
  const maxJitterMm = canvasWidth * 0.15
  const layers: Layer[] = []

  for (let i = 0; i < count; i++) {
    const r = scaled[i]
    const xJitter = computeAxisJitter(i, params.coherence, noise, maxJitterMm)
    const centerX = canvasWidth / 2 + xJitter
    const centerY = cursorY

    const rock = generateRock(
      centerX,
      centerY,
      r,
      i,
      params.rockParams,
      noise,
    )

    layers.push({
      id: `layer-${i}`,
      shape: 'rock',
      x: rock.boundingBox.x,
      y: rock.boundingBox.y,
      width: rock.boundingBox.width,
      height: rock.boundingBox.height,
      rotation: 0,
      skew: 0,
      colorHex: '#000000',
      area: rock.boundingBox.width * rock.boundingBox.height,
      polygon: rock,
    })

    const nextR = i + 1 < count ? scaled[i + 1] : r
    cursorY += r + gap + nextR
  }

  return layers
}

function placeCircleLayers(
  sizes: number[],
  params: PosterParams,
  noise: NoiseFn,
  canvasWidth: number,
  canvasHeight: number,
): Layer[] {
  const count = sizes.length
  const baseMax = params.baseSize * canvasHeight

  // Diameter from Fibonacci weight; cap to fit within canvas.
  const diameters = sizes.map((w) =>
    Math.min(baseMax * w, canvasWidth * 0.95, canvasHeight * 0.6),
  )

  const totalHeight = diameters.reduce((a, d) => a + d, 0)
  const targetStackHeight = canvasHeight * 0.85
  const stackScale = totalHeight > targetStackHeight ? targetStackHeight / totalHeight : 1
  const scaled = diameters.map((d) => d * stackScale)

  const finalStackHeight = scaled.reduce((a, d) => a + d, 0)
  const gapCount = Math.max(1, count - 1)
  const rawGap = (canvasHeight - finalStackHeight) / (gapCount + 2)
  const gap = rawGap - Math.min(scaled[0] * 0.15, 20)

  let cursorY = (canvasHeight - (finalStackHeight + gap * gapCount)) / 2
  const maxJitterMm = canvasWidth * 0.15
  const layers: Layer[] = []

  for (let i = 0; i < count; i++) {
    const d = scaled[i]
    const xJitter = computeAxisJitter(i, params.coherence, noise, maxJitterMm)

    layers.push({
      id: `layer-${i}`,
      shape: 'circle',
      x: (canvasWidth - d) / 2 + xJitter,
      y: cursorY,
      width: d,
      height: d,
      rotation: 0,
      skew: 0,
      colorHex: '#000000',
      area: Math.PI * (d / 2) * (d / 2),
    })
    cursorY += d + gap
  }

  return layers
}

// Rules A + E — lay out layers along the vertical axis with sine-based jitter.
export function placeLayers(
  sizes: number[],
  proportions: number[],
  params: PosterParams,
  _rng: RNG,
  noise: NoiseFn,
  canvasWidth: number,
  canvasHeight: number,
): Layer[] {
  if (sizes.length === 0) return []

  let layers: Layer[]
  if (params.blockShape === 'rock') {
    layers = placeRockLayers(sizes, params, noise, canvasWidth, canvasHeight)
  } else if (params.blockShape === 'circle') {
    layers = placeCircleLayers(sizes, params, noise, canvasWidth, canvasHeight)
  } else {
    layers = placeRectangleLayers(sizes, proportions, params, noise, canvasWidth, canvasHeight)
  }

  const minSized =
    params.blockShape === 'rectangle'
      ? enforceMinSideLength(layers, params.baseSize, canvasHeight)
      : layers
  return clampToCanvas(minSized, canvasWidth, canvasHeight)
}

function clampToCanvas(layers: Layer[], canvasWidth: number, canvasHeight: number): Layer[] {
  return layers.map((l) => {
    const x = Math.max(-l.width * 0.1, Math.min(canvasWidth - l.width * 0.9, l.x))
    const y = Math.max(-l.height * 0.1, Math.min(canvasHeight - l.height * 0.9, l.y))
    if (l.shape === 'rock' && l.polygon) {
      const dx = x - l.x
      const dy = y - l.y
      const p = translateRock(l.polygon, dx, dy)
      return { ...l, x, y, polygon: p }
    }
    return { ...l, x, y }
  })
}

function rotatedAABB(layer: Layer): {
  top: number
  bottom: number
  left: number
  right: number
} {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  if (layer.shape === 'circle') {
    const r = layer.width / 2
    return { top: cy - r, bottom: cy + r, left: cx - r, right: cx + r }
  }
  const theta = (layer.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(theta))
  const sin = Math.abs(Math.sin(theta))
  const w2 = (layer.width * cos + layer.height * sin) / 2
  const h2 = (layer.width * sin + layer.height * cos) / 2
  return {
    top: cy - h2,
    bottom: cy + h2,
    left: cx - w2,
    right: cx + w2,
  }
}

// Rule D — vertical-chain overlap clamped into a tight BAND.
// Every adjacent pair has an overlap of at least `min(overlap, layerMinDim * minRatio)`
// and at most `layerMinDim * maxRatio`, where the ratios flank `overlapDepth`.
// This replaces the v0.2 floor-only semantic per v0.3 feedback.
export function enforceVerticalChain(
  layers: Layer[],
  overlapDepth: number,
  _breathingRoom: number, // retained signature arg but ignored (v0.3 removed the concept)
  _rng: RNG,
): Layer[] {
  if (layers.length < 2) return layers
  const sorted = [...layers]
    .sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2))
    .map((l) => ({ ...l }))

  // Tight band around the target depth. Floor 3%, ceiling 20%.
  const minRatio = Math.max(0.03, overlapDepth - 0.05)
  const maxRatio = Math.min(0.2, overlapDepth + 0.05)

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]

    if (prev.shape === 'rock' && curr.shape === 'rock') {
      enforceRockPair(prev, curr, minRatio, maxRatio)
    } else if (prev.shape === 'circle' && curr.shape === 'circle') {
      enforceCirclePair(prev, curr, minRatio, maxRatio)
    } else {
      enforceRectPair(prev, curr, minRatio, maxRatio)
    }
  }

  return sorted
}

function enforceRockPair(prev: Layer, curr: Layer, minRatio: number, maxRatio: number): void {
  if (!prev.polygon || !curr.polygon) return
  const minDim = Math.min(prev.polygon.boundingBox.height, curr.polygon.boundingBox.height)
  const minOverlap = minDim * minRatio
  const maxOverlap = minDim * maxRatio
  // Use bbox overlap as the pull magnitude; SAT for the yes/no intersection test.
  const currentOverlap =
    prev.polygon.boundingBox.y + prev.polygon.boundingBox.height -
    curr.polygon.boundingBox.y
  let dy = 0
  // Step 1: coarse pull based on bbox overlap into band.
  if (currentOverlap < minOverlap) {
    dy = -(minOverlap - currentOverlap)
  } else if (currentOverlap > maxOverlap) {
    dy = currentOverlap - maxOverlap
  }
  if (dy !== 0) {
    curr.polygon = translateRock(curr.polygon, 0, dy)
  }
  // Step 2: if SAT still separates them despite bbox overlap, pull until SAT says
  // they intersect. Bounded at half the minDim of pull to avoid runaway.
  if (!polygonsIntersect(prev.polygon.points, curr.polygon.points)) {
    let extra = 0
    const stepPx = Math.max(0.5, minDim * 0.05)
    while (
      extra < minDim &&
      !polygonsIntersect(prev.polygon.points, curr.polygon.points)
    ) {
      curr.polygon = translateRock(curr.polygon, 0, -stepPx)
      extra += stepPx
    }
  }
  curr.x = curr.polygon.boundingBox.x
  curr.y = curr.polygon.boundingBox.y
  curr.width = curr.polygon.boundingBox.width
  curr.height = curr.polygon.boundingBox.height
}

function enforceRectPair(prev: Layer, curr: Layer, minRatio: number, maxRatio: number): void {
  const prevBox = rotatedAABB(prev)
  const currBox = rotatedAABB(curr)
  const minDim = Math.min(prev.height, curr.height)
  const minOverlap = minDim * minRatio
  const maxOverlap = minDim * maxRatio
  // currentOverlap > 0 = overlapping, < 0 = separated gap
  const currentOverlap = prevBox.bottom - currBox.top
  if (currentOverlap < minOverlap) {
    curr.y -= minOverlap - currentOverlap
  } else if (currentOverlap > maxOverlap) {
    curr.y += currentOverlap - maxOverlap
  }
}

function enforceCirclePair(prev: Layer, curr: Layer, minRatio: number, maxRatio: number): void {
  const prevCx = prev.x + prev.width / 2
  const prevCy = prev.y + prev.height / 2
  const currCx = curr.x + curr.width / 2
  const currCy = curr.y + curr.height / 2
  const dx = currCx - prevCx
  const dy = currCy - prevCy
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const sumRadii = (prev.width + curr.width) / 2
  const minDiameter = Math.min(prev.width, curr.width)
  // Overlap depth along connecting line. Positive = overlapping.
  const currentOverlap = sumRadii - dist
  const minOverlap = minDiameter * minRatio
  const maxOverlap = minDiameter * maxRatio
  if (currentOverlap < minOverlap) {
    // Pull curr toward prev.
    const pull = minOverlap - currentOverlap
    curr.x -= ux * pull
    curr.y -= uy * pull
  } else if (currentOverlap > maxOverlap) {
    // Push curr away from prev.
    const push = currentOverlap - maxOverlap
    curr.x += ux * push
    curr.y += uy * push
  }
}
