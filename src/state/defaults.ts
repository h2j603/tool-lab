import { PosterParams } from '../engine/types'

export const DEFAULT_PARAMS: PosterParams = {
  layerCount: 4,
  coherence: 0.65,
  overlapDepth: 0.2,
  breathingRoom: 0,
  blockShape: 'rectangle',

  proportionSet: 'classical',
  baseSize: 0.6,

  globalTilt: 4,
  localVariation: 2,
  skew: 1,

  paletteId: 'strelka',

  text: 'color\nstack\n——\n001',
  fontSource: 'system',
  fontFamily: 'Helvetica, Arial, sans-serif',
  textSize: 0.28,
  typePlacement: 'boundary-cross',

  canvasSize: 'A3',
  bleedMm: 3,

  moire: {
    enabled: false,
    baseAngleDelta: 2,
    baseSpacing: 2,
    baseDotRadius: 0.35,
    variation: 0.4,
    interferenceColor: 'auto',
  },

  seed: 42,
  experimental: { enabled: false },
}
