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
export type BlockShape = 'rectangle' | 'circle' | 'rock'

export interface RockParams {
  roughness: number   // 0..0.5
  spikiness: number   // 0..1
  vertexCount: number // 12..64
}

export interface RockPolygonData {
  points: { x: number; y: number }[]
  centerX: number
  centerY: number
  centroid: { x: number; y: number }
  boundingBox: { x: number; y: number; width: number; height: number }
}
export type MacroMode = 'vertical-stack' | 'letter-form'
export type BundledFontId = 'inter' | 'noto-sans-kr'
export type LetterFormFontSource =
  | { kind: 'bundled'; id: BundledFontId }
  | { kind: 'uploaded'; fileName: string }

export type AllocationStrategy = 'area' | 'even'

export interface LetterFormParams {
  text: string
  fontSource: LetterFormFontSource
  blockCenterTolerance: number
  regionBlockAllocation: AllocationStrategy
}

export interface ExperimentalFlags {
  enabled: boolean
}

export type PatternType = 'moire' | 'stripes' | 'rings'
export type RingsCenterMode = 'center' | 'offset' | 'random'

export interface PatternParams {
  enabled: boolean
  type: PatternType
  // Shared across all pattern types
  density: number           // 0.2..1.0
  contrast: number          // 0.3..1.0
  variation: number         // 0..0.6
  secondaryColor: 'auto' | string
  // Type-specific
  moire: { baseAngleDelta: number } // 0.3..5
  stripes: { angle: number }        // 0..180 (degrees)
  rings: { centerMode: RingsCenterMode; ringCount: number }
}

export interface MoireLayerData {
  type: 'moire'
  primaryColor: string
  secondaryColor: string
  spacing: number
  dotRadius: number
  angleDelta: number
}

export interface StripesLayerData {
  type: 'stripes'
  primaryColor: string
  secondaryColor: string
  thickness: number
  spacing: number
  angle: number
}

export interface RingsLayerData {
  type: 'rings'
  primaryColor: string
  secondaryColor: string
  ringThickness: number
  ringSpacing: number
  ringCount: number
  centerX: number
  centerY: number
}

export type LayerPatternData = MoireLayerData | StripesLayerData | RingsLayerData

// Back-compat aliases (deprecated, removed from runtime logic — kept only for
// any outside importer that still refers to v0.2 names).
export type MoireParams = PatternParams
export type LayerMoire = MoireLayerData

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
  backgroundOverride: 'palette' | 'transparent'

  // Pattern
  pattern: PatternParams

  // Rock-specific
  rockParams: RockParams

  // Macro mode
  macroMode: MacroMode
  letterForm: LetterFormParams

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
  pattern?: LayerPatternData
  polygon?: RockPolygonData
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
