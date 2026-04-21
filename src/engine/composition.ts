import { NoiseFn, RNG, noise1D, shuffle } from './random'
import { Layer, PosterParams, ProportionSet } from './types'

export const PROPORTION_SETS: Record<ProportionSet, number[]> = {
  classical: [1, Math.SQRT2, 1.618, 2, 3],
  extreme: [1, 2, 3, 5, 7],
  balanced: [1, Math.SQRT2, 2],
}

const FIBONACCI_WEIGHTS = [1, 2, 3, 5, 8, 13, 21]

const MIN_SIDE_RATIO = 0.25

// Rule B — weighted sizes in [0, 1].
// Experimental mode allows near-equal sizes with a small jitter.
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

// Rule C — aspect ratios pulled from a restricted set.
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

// Rule A — sine-biased x-jitter. Sine enforces alternation; noise adds organic variation.
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

// Enforce minimum side length so no layer becomes a sliver.
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
  const count = sizes.length
  if (count === 0) return []

  const baseMax = params.baseSize * canvasHeight

  const tentative: { w: number; h: number; ratio: number }[] = []
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
    tentative.push({ w, h, ratio })
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

  const minSized = enforceMinSideLength(layers, params.baseSize, canvasHeight)
  return clampToCanvas(minSized, canvasWidth, canvasHeight)
}

function clampToCanvas(layers: Layer[], canvasWidth: number, canvasHeight: number): Layer[] {
  return layers.map((l) => {
    const x = Math.max(-l.width * 0.1, Math.min(canvasWidth - l.width * 0.9, l.x))
    const y = Math.max(-l.height * 0.1, Math.min(canvasHeight - l.height * 0.9, l.y))
    return { ...l, x, y }
  })
}

// Axis-aligned bounding box of a rotated rectangle centered on (cx, cy).
function rotatedAABB(layer: Layer): {
  top: number
  bottom: number
  left: number
  right: number
} {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
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

// Rule D — hard vertical-chain overlap. Every adjacent pair (by y order)
// must overlap by at least `min(prevHeight, currHeight) * overlapDepth`,
// unless the pair is one of the allowed "breathing room" gaps.
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

    const prevBox = rotatedAABB(prev)
    const currBox = rotatedAABB(curr)

    const minDim = Math.min(prev.height, curr.height)
    const pairIdx = i - 1

    if (gapIndices.has(pairIdx)) {
      // Allow a small intentional gap, but cap it at 0.5 * min height.
      const maxGap = minDim * 0.5
      const rawGap = currBox.top - prevBox.bottom
      if (rawGap > maxGap) {
        curr.y -= rawGap - maxGap
      }
      continue
    }

    const minOverlapMm = minDim * overlapDepth
    const gap = currBox.top - prevBox.bottom
    if (gap > -minOverlapMm) {
      curr.y -= gap + minOverlapMm
    }
  }

  return sorted
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
