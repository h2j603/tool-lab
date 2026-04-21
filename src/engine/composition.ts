import { NoiseFn, RNG, noise1D, shuffle } from './random'
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

  const layers =
    params.blockShape === 'circle'
      ? placeCircleLayers(sizes, params, noise, canvasWidth, canvasHeight)
      : placeRectangleLayers(sizes, proportions, params, noise, canvasWidth, canvasHeight)

  const minSized =
    params.blockShape === 'circle'
      ? layers
      : enforceMinSideLength(layers, params.baseSize, canvasHeight)
  return clampToCanvas(minSized, canvasWidth, canvasHeight)
}

function clampToCanvas(layers: Layer[], canvasWidth: number, canvasHeight: number): Layer[] {
  return layers.map((l) => {
    const x = Math.max(-l.width * 0.1, Math.min(canvasWidth - l.width * 0.9, l.x))
    const y = Math.max(-l.height * 0.1, Math.min(canvasHeight - l.height * 0.9, l.y))
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

// Rule D — hard vertical-chain overlap, shape-aware.
// Rectangles: axis-aligned gap on rotated bbox; pull down along Y.
// Circles: center-to-center distance; pull along the connecting line.
export function enforceVerticalChain(
  layers: Layer[],
  overlapDepth: number,
  breathingRoom: number,
  rng: RNG,
): Layer[] {
  if (layers.length < 2) return layers
  const sorted = [...layers]
    .sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2))
    .map((l) => ({ ...l }))

  const numPairs = sorted.length - 1
  const numGapsAllowed = Math.floor(numPairs * breathingRoom)
  const gapIndices = pickRandomIndices(numPairs, numGapsAllowed, rng)

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const allowGap = gapIndices.has(i - 1)

    if (prev.shape === 'circle' && curr.shape === 'circle') {
      enforceCirclePair(prev, curr, overlapDepth, allowGap)
    } else {
      enforceRectPair(prev, curr, overlapDepth, allowGap)
    }
  }

  return sorted
}

function enforceRectPair(prev: Layer, curr: Layer, overlapDepth: number, allowGap: boolean): void {
  const prevBox = rotatedAABB(prev)
  const currBox = rotatedAABB(curr)
  const minDim = Math.min(prev.height, curr.height)

  if (allowGap) {
    const maxGap = minDim * 0.5
    const rawGap = currBox.top - prevBox.bottom
    if (rawGap > maxGap) {
      curr.y -= rawGap - maxGap
    }
    return
  }

  const minOverlapMm = minDim * overlapDepth
  const gap = currBox.top - prevBox.bottom
  if (gap > -minOverlapMm) {
    curr.y -= gap + minOverlapMm
  }
}

function enforceCirclePair(
  prev: Layer,
  curr: Layer,
  overlapDepth: number,
  allowGap: boolean,
): void {
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

  if (allowGap) {
    const maxCenterDist = sumRadii + minDiameter * 0.5
    if (dist > maxCenterDist) {
      const pull = dist - maxCenterDist
      curr.x -= ux * pull
      curr.y -= uy * pull
    }
    return
  }

  const requiredDist = sumRadii - minDiameter * overlapDepth
  if (dist > requiredDist) {
    const pull = dist - requiredDist
    curr.x -= ux * pull
    curr.y -= uy * pull
  }
}

function pickRandomIndices(total: number, count: number, rng: RNG): Set<number> {
  if (count <= 0 || total <= 0) return new Set()
  const indices = Array.from({ length: total }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return new Set(indices.slice(0, Math.min(count, total)))
}
