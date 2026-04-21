export type ColorRole = 'dominant' | 'secondary' | 'accent' | 'background'

export interface PaletteColor {
  hex: string
  role: ColorRole
  label?: string
}

export interface Palette {
  id: string
  name: string
  character: string
  colors: PaletteColor[]
  isCustom: boolean
  basedOn?: string
}

export type ProportionSet = 'classical' | 'extreme' | 'balanced'
export type TypePlacement = 'boundary-cross' | 'single-layer' | 'scattered'
export type CanvasSize = 'A3' | 'A2' | 'B1' | 'custom'
export type BlockShape = 'rectangle' | 'circle'

export interface ExperimentalFlags {
  enabled: boolean
}

export interface MoireParams {
  enabled: boolean
  baseAngleDelta: number    // degrees, 0.5..10
  baseSpacing: number       // mm, 0.5..5
  baseDotRadius: number     // fraction of spacing, 0.15..0.45
  variation: number         // 0..1, per-block deviation from base
  interferenceColor: 'auto' | string  // 'auto' = darken the block color
}

export interface LayerMoire {
  angleDelta: number
  spacing: number
  dotRadius: number         // fraction of spacing
  primaryColor: string
  interferenceColor: string
}

export type FontSource =
  | 'system'
  | { type: 'upload'; data: ArrayBuffer; name: string }

export interface PosterParams {
  // Composition
  layerCount: number
  coherence: number
  overlapDepth: number      // 0.10..0.40 — how deeply adjacent pairs overlap
  breathingRoom: number     // 0..1 — proportion of pairs allowed to have small gaps
  blockShape: BlockShape    // global per-poster shape choice

  // Proportion
  proportionSet: ProportionSet
  baseSize: number

  // Rotation
  globalTilt: number
  localVariation: number
  skew: number

  // Color
  paletteId: string

  // Typography
  text: string
  fontSource: FontSource
  fontFamily: string
  textSize: number
  typePlacement: TypePlacement

  // Canvas
  canvasSize: CanvasSize
  customCanvasWidth?: number
  customCanvasHeight?: number
  bleedMm: number

  // Pattern
  moire: MoireParams

  // Meta
  seed: number
  experimental: ExperimentalFlags
}

export interface Layer {
  id: string
  shape: BlockShape
  x: number
  y: number
  width: number
  height: number
  rotation: number
  skew: number
  colorHex: string
  area: number
  moire?: LayerMoire
}

export interface TypeBlock {
  id: string
  text: string
  x: number
  y: number
  rotation: number
  fontSize: number
  fontFamily: string
  anchor: 'start' | 'middle' | 'end'
}

export interface Poster {
  canvasWidth: number
  canvasHeight: number
  bleedMm: number
  backgroundHex: string
  layers: Layer[]
  typeBlocks: TypeBlock[]
  seed: number
  paramsSnapshot: PosterParams
}

export const CANVAS_DIMENSIONS: Record<Exclude<CanvasSize, 'custom'>, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  B1: { width: 707, height: 1000 },
}
