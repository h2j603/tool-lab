import { NoiseFn, RNG } from './random'
import {
  Layer,
  LayerPatternData,
  Palette,
  PatternParams,
  PatternType,
} from './types'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1)
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '')
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16)
    const g = parseInt(s[1] + s[1], 16)
    const b = parseInt(s[2] + s[2], 16)
    return [r, g, b]
  }
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const k = clamp(1 - amount, 0, 1)
  return rgbToHex(r * k, g * k, b * k)
}

export function resolveSecondaryColor(
  primaryHex: string,
  contrast: number,
  userOverride: string | 'auto',
): string {
  if (userOverride !== 'auto') return userOverride
  // contrast 0.3 → subtle (0.2 darken), contrast 1.0 → strong (0.7 darken)
  const darkenAmount = lerp(0.2, 0.7, (contrast - 0.3) / 0.7)
  return darkenHex(primaryHex, darkenAmount)
}

function densityT(density: number): number {
  return (density - 0.2) / 0.8
}

function applyVariation(
  base: number,
  v: number,
  layerIndex: number,
  noise: NoiseFn,
  range = 1,
  salt = 0,
): number {
  return base + noise(layerIndex * 1.1 + 100 + salt, 0) * v * range
}

export function deriveMoireData(
  layer: Layer,
  layerIndex: number,
  base: PatternParams,
  noise: NoiseFn,
): LayerPatternData {
  const t = densityT(base.density)
  const spacing = lerp(4.0, 0.8, t)
  const dotRadiusFrac = 0.35
  const angleDelta = Math.max(
    0.3,
    base.moire.baseAngleDelta +
      noise(layerIndex * 1.1 + 100, 0) * base.variation * 1.5,
  )
  const spacingVaried = clamp(
    spacing * (1 + noise(layerIndex * 1.3 + 200, 0) * base.variation * 0.4),
    0.4,
    6,
  )
  return {
    type: 'moire',
    primaryColor: layer.colorHex,
    secondaryColor: resolveSecondaryColor(
      layer.colorHex,
      base.contrast,
      base.secondaryColor,
    ),
    spacing: spacingVaried,
    dotRadius: dotRadiusFrac * spacingVaried,
    angleDelta,
  }
}

export function deriveStripesData(
  layer: Layer,
  layerIndex: number,
  base: PatternParams,
  noise: NoiseFn,
): LayerPatternData {
  const t = densityT(base.density)
  const thicknessRatio = lerp(0.06, 0.015, t)
  const blockMinDim = Math.min(layer.width, layer.height)
  const thickness = Math.max(0.4, blockMinDim * thicknessRatio)
  const spacing = thickness * 2 // one dark + one light band per tile
  const angle =
    base.stripes.angle +
    applyVariation(0, base.variation, layerIndex, noise, 60)
  return {
    type: 'stripes',
    primaryColor: layer.colorHex,
    secondaryColor: resolveSecondaryColor(
      layer.colorHex,
      base.contrast,
      base.secondaryColor,
    ),
    thickness,
    spacing,
    angle,
  }
}

export function deriveRingsData(
  layer: Layer,
  layerIndex: number,
  base: PatternParams,
  rng: RNG,
  noise: NoiseFn,
): LayerPatternData {
  const t = densityT(base.density)
  const baseCount = lerp(4, 16, t)
  const ringCount = clamp(
    Math.round(baseCount + applyVariation(0, base.variation, layerIndex, noise, 4)),
    3,
    20,
  )
  const blockMinDim = Math.min(layer.width, layer.height)
  const maxRadius = blockMinDim * 0.7
  const ringSpacing = maxRadius / ringCount
  const ringThickness = ringSpacing * 0.5

  const blockCenterX = layer.x + layer.width / 2
  const blockCenterY = layer.y + layer.height / 2

  let cx = blockCenterX
  let cy = blockCenterY
  if (base.rings.centerMode === 'offset') {
    cx += noise(layerIndex * 2.1, 0) * layer.width * 0.3
    cy += noise(layerIndex * 2.3, 0) * layer.height * 0.3
  } else if (base.rings.centerMode === 'random') {
    cx = layer.x + rng() * layer.width
    cy = layer.y + rng() * layer.height
  }

  return {
    type: 'rings',
    primaryColor: layer.colorHex,
    secondaryColor: resolveSecondaryColor(
      layer.colorHex,
      base.contrast,
      base.secondaryColor,
    ),
    ringThickness,
    ringSpacing,
    ringCount,
    centerX: cx,
    centerY: cy,
  }
}

export function derivePatternForLayer(
  layer: Layer,
  layerIndex: number,
  base: PatternParams,
  rng: RNG,
  noise: NoiseFn,
): LayerPatternData {
  switch (base.type) {
    case 'moire':
      return deriveMoireData(layer, layerIndex, base, noise)
    case 'stripes':
      return deriveStripesData(layer, layerIndex, base, noise)
    case 'rings':
      return deriveRingsData(layer, layerIndex, base, rng, noise)
  }
}

export function attachPatternParams(
  layers: Layer[],
  base: PatternParams,
  rng: RNG,
  noise: NoiseFn,
  _palette: Palette,
): Layer[] {
  if (!base.enabled) return layers
  return layers.map((layer, i) => ({
    ...layer,
    pattern: derivePatternForLayer(layer, i, base, rng, noise),
  }))
}

// Back-compat export — mirrors the old name used by generator/letterForm.
// Pattern-type logic now branches on `PatternParams.type`.
export function attachMoireParams(
  layers: Layer[],
  base: PatternParams,
  rng: RNG,
  noise: NoiseFn,
  palette: Palette,
): Layer[] {
  return attachPatternParams(layers, base, rng, noise, palette)
}

export { clamp, lerp, type PatternType }
