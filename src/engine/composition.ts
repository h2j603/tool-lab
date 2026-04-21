import { NoiseFn, RNG, noise1D, shuffle } from './random'
import { Layer, PosterParams, ProportionSet } from './types'

export const PROPORTION_SETS: Record<ProportionSet, number[]> = {
  classical: [1, Math.SQRT2, 1.618, 2, 3, 5],
  extreme: [1, 2, 4, 7, 11],
  balanced: [1, Math.SQRT2, 2],
}

const FIBONACCI_WEIGHTS = [1, 2, 3, 5, 8, 13, 21]

// Rule B — weighted sizes in [0, 1].
// Experimental mode allows near-equal sizes with a small jitter.
export function generateWeightedSizes(
  count: number,
  rng: RNG,
  experimentalEqualSizes: boolean,
): number[] {
  if (count <= 0) return []

  if (experimentalEqualSizes) {
    // Equal sizes with subtle variance (±10%).
    return Array.from({ length: count }, () => 0.8 + (rng() - 0.5) * 0.2)
  }

  const base = FIBONACCI_WEIGHTS.slice(0, count)
  const total = base.reduce((a, b) => a + b, 0)
  // Normalize so the mean is near 1; scale so the largest maps to ~1.
  const max = base[base.length - 1]
  const normalized = base.map((w) => w / max)
  // Make sure even the smallest weight isn't invisible.
  const floored = normalized.map((v) => Math.max(0.12, v))
  // Re-normalize so the mean preserves rough total area.
  const sum = floored.reduce((a, b) => a + b, 0)
  const scale = total / max / sum
  const sized = floored.map((v) => Math.min(1, v * scale))
  return shuffle(sized, rng)
}

// Rule C — aspect ratios pulled from a restricted set.
// Experimental mode draws free ratios from [0.6, 2.5].
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
    // Randomly invert to get vertical layers too, ~30% of the time.
    result.push(rng() < 0.3 ? 1 / ratio : ratio)
  }
  return result
}

// Rules A + E — lay out layers along the vertical axis with noise jitter.
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

  // Target size of each layer: the larger dimension is baseSize * canvasHeight * weight.
  const baseMax = params.baseSize * canvasHeight

  // First pass: compute widths/heights, then vertically stack with equal gaps.
  const layers: Layer[] = []
  let totalHeight = 0
  const tentative: { w: number; h: number; ratio: number }[] = []
  for (let i = 0; i < count; i++) {
    const weight = sizes[i]
    const ratio = proportions[i]
    // Pick the long side as `baseMax * weight`; derive the short side from ratio.
    let w: number
    let h: number
    if (ratio >= 1) {
      w = baseMax * weight
      h = w / ratio
    } else {
      h = baseMax * weight
      w = h * ratio
    }
    // Cap to canvas to avoid runaways.
    w = Math.min(w, canvasWidth * 0.95)
    h = Math.min(h, canvasHeight * 0.6)
    tentative.push({ w, h, ratio })
    totalHeight += h
  }

  // Desired overall stack height: ~85% of canvas, leaving margin.
  const targetStackHeight = canvasHeight * 0.85
  const stackScale = totalHeight > targetStackHeight ? targetStackHeight / totalHeight : 1
  for (const t of tentative) {
    t.w *= stackScale
    t.h *= stackScale
  }

  const finalStackHeight = tentative.reduce((a, t) => a + t.h, 0)
  // Gap: negative so layers overlap by default — reinforces Rule D.
  const gapCount = Math.max(1, count - 1)
  const rawGap = (canvasHeight - finalStackHeight) / (gapCount + 2)
  // Push gap slightly negative so consecutive layers overlap naturally.
  const gap = rawGap - Math.min(tentative[0].h * 0.15, 20)

  let cursorY = (canvasHeight - (finalStackHeight + gap * gapCount)) / 2

  for (let i = 0; i < count; i++) {
    const { w, h } = tentative[i]

    const jitterAmp = (1 - params.coherence) * canvasWidth * 0.15
    const xJitter = noise1D(noise, i, 0.3) * jitterAmp

    const localRot = noise1D(noise, i + 100, 0.5) * params.localVariation
    const rotation = params.globalTilt + localRot

    const layer: Layer = {
      id: `layer-${i}`,
      x: (canvasWidth - w) / 2 + xJitter,
      y: cursorY,
      width: w,
      height: h,
      rotation,
      skew: params.skew,
      colorHex: '#000000',
      area: w * h,
    }
    layers.push(layer)
    cursorY += h + gap
  }

  // Keep layers inside the canvas bounds.
  return clampToCanvas(layers, canvasWidth, canvasHeight)
}

function clampToCanvas(layers: Layer[], canvasWidth: number, canvasHeight: number): Layer[] {
  return layers.map((l) => {
    const x = Math.max(-l.width * 0.1, Math.min(canvasWidth - l.width * 0.9, l.x))
    const y = Math.max(-l.height * 0.1, Math.min(canvasHeight - l.height * 0.9, l.y))
    return { ...l, x, y }
  })
}

// Rule D — ensure every layer overlaps at least one neighbor.
export function enforceOverlap(layers: Layer[], targetDensity: number): Layer[] {
  if (layers.length < 2) return layers
  const result = layers.map((l) => ({ ...l }))

  for (let i = 0; i < result.length; i++) {
    const a = result[i]
    let bestIdx = -1
    let bestDist = Infinity
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue
      const b = result[j]
      const d = bboxGap(a, b)
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }
    if (bestIdx === -1) continue
    if (bestDist <= 0) continue // already overlapping

    const b = result[bestIdx]
    const ax = a.x + a.width / 2
    const ay = a.y + a.height / 2
    const bx = b.x + b.width / 2
    const by = b.y + b.height / 2
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    const pullFactor = 0.3 + targetDensity * 0.7
    const overlapBonus = Math.min(a.width, a.height) * 0.15
    const shift = (bestDist + overlapBonus) * pullFactor
    result[i] = {
      ...a,
      x: a.x + (dx / len) * shift,
      y: a.y + (dy / len) * shift,
    }
  }

  return result
}

// Gap between two axis-aligned bounding boxes. <=0 means overlap.
function bboxGap(a: Layer, b: Layer): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0)
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0)
  if (dx === 0 && dy === 0) return -1 // definitely overlapping
  return Math.hypot(dx, dy)
}
