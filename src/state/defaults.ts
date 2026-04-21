import { PosterParams } from '../engine/types'

export const DEFAULT_PARAMS: PosterParams = {
  layerCount: 4,
  coherence: 0.65,
  overlapDensity: 0.4,

  proportionSet: 'classical',
  baseSize: 0.6,

  globalTilt: 3,
  localVariation: 2,
  skew: 0,

  paletteId: 'strelka',

  text: 'color\nstack\n——\n001',
  fontSource: 'system',
  fontFamily: 'Helvetica, Arial, sans-serif',
  textSize: 0.28,
  typePlacement: 'boundary-cross',

  canvasSize: 'A3',
  bleedMm: 3,

  seed: 42,
  experimental: { enabled: false },
}
