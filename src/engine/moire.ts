import { NoiseFn, RNG } from './random'
import { Layer, LayerMoire, MoireParams, Palette } from './types'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// HEX (#rrggbb or #rgb) -> [r, g, b] in 0..255.
function hexToRgb(hex: string): [number, number, number] {
  const stripped = hex.replace('#', '')
  if (stripped.length === 3) {
    const r = parseInt(stripped[0] + stripped[0], 16)
    const g = parseInt(stripped[1] + stripped[1], 16)
    const b = parseInt(stripped[2] + stripped[2], 16)
    return [r, g, b]
  }
  const r = parseInt(stripped.slice(0, 2), 16)
  const g = parseInt(stripped.slice(2, 4), 16)
  const b = parseInt(stripped.slice(4, 6), 16)
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

// Darken a hex color by multiplying luminance-like terms.
// `amount` 0..1; 0 = no change, 1 = black.
export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const k = clamp(1 - amount, 0, 1)
  return rgbToHex(r * k, g * k, b * k)
}

export function resolveInterferenceColor(
  layer: Layer,
  base: MoireParams,
  _palette: Palette,
): string {
  if (base.interferenceColor !== 'auto') return base.interferenceColor
  return darkenHex(layer.colorHex, 0.45)
}

export function deriveMoireParamsForLayer(
  layer: Layer,
  layerIndex: number,
  base: MoireParams,
  _rng: RNG,
  noise: NoiseFn,
  palette: Palette,
): LayerMoire {
  const v = base.variation

  const angleDelta = Math.max(
    0.5,
    base.baseAngleDelta + noise(layerIndex * 1.1 + 100, 0) * v * 4,
  )
  const spacing = clamp(
    base.baseSpacing * (1 + noise(layerIndex * 1.3 + 200, 0) * v * 0.6),
    0.4,
    6,
  )
  const dotRadius = clamp(
    base.baseDotRadius * (1 + noise(layerIndex * 1.7 + 300, 0) * v * 0.3),
    0.1,
    0.48,
  )

  return {
    angleDelta,
    spacing,
    dotRadius,
    primaryColor: layer.colorHex,
    interferenceColor: resolveInterferenceColor(layer, base, palette),
  }
}

export function attachMoireParams(
  layers: Layer[],
  base: MoireParams,
  rng: RNG,
  noise: NoiseFn,
  palette: Palette,
): Layer[] {
  if (!base.enabled) return layers
  return layers.map((layer, i) => ({
    ...layer,
    moire: deriveMoireParamsForLayer(layer, i, base, rng, noise, palette),
  }))
}
