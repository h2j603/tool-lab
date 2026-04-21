import { PosterParams } from '../engine/types'

export const DEFAULT_PARAMS: PosterParams = {
  layerCount: 4,
  coherence: 0.65,
  overlapDepth: 0.08,
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
  backgroundOverride: 'palette',

  pattern: {
    enabled: false,
    type: 'moire',
    density: 0.6,
    contrast: 0.7,
    variation: 0.25,
    secondaryColor: 'auto',
    moire: { baseAngleDelta: 1.5 },
    stripes: { angle: 0 },
    rings: { centerMode: 'offset', ringCount: 8 },
  },

  rockParams: {
    roughness: 0.2,
    spikiness: 0.3,
    vertexCount: 24,
  },

  macroMode: 'vertical-stack',
  letterForm: {
    text: 'A',
    fontSource: { kind: 'bundled', id: 'inter' },
    blockCenterTolerance: 0,
    regionBlockAllocation: 'area',
  },

  seed: 42,
  experimental: { enabled: false },
}
