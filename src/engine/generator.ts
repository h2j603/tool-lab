import type opentype from 'opentype.js'
import { assignColorsByWeight } from './color'
import {
  enforceVerticalChain,
  generateWeightedSizes,
  pickProportions,
  placeLayers,
} from './composition'
import {
  generateLetterFormPoster,
  LetterFormContext,
} from './letterFormGenerator'
import { attachPatternParams } from './pattern'
import { createNoise2D, createRng } from './random'
import {
  CANVAS_DIMENSIONS,
  Palette,
  Poster,
  PosterParams,
} from './types'
import { placeTypeBlocks } from './typography'

export interface GenerateContext {
  // Map of bundled font id -> parsed font. Populated after fonts load.
  bundledFonts?: Partial<Record<string, opentype.Font>>
  uploadedFont?: opentype.Font
}

export function resolveCanvasDimensions(params: PosterParams): {
  canvasWidth: number
  canvasHeight: number
  bleedMm: number
} {
  if (params.canvasSize === 'custom') {
    return {
      canvasWidth: params.customCanvasWidth ?? 297,
      canvasHeight: params.customCanvasHeight ?? 420,
      bleedMm: params.bleedMm,
    }
  }
  const { width, height } = CANVAS_DIMENSIONS[params.canvasSize]
  return { canvasWidth: width, canvasHeight: height, bleedMm: params.bleedMm }
}

export function generatePoster(
  params: PosterParams,
  palettes: Palette[],
  ctx: GenerateContext = {},
): Poster {
  const palette = palettes.find((p) => p.id === params.paletteId)
  if (!palette) throw new Error(`Palette not found: ${params.paletteId}`)

  if (params.macroMode === 'letter-form') {
    const font = resolveLetterFormFont(params, ctx)
    if (!font) {
      // Caller hasn't provided the requested font yet — degrade gracefully by
      // falling back to the vertical-stack pipeline until the font loads.
      return generateVerticalStack(params, palette)
    }
    const lfCtx: LetterFormContext = { font }
    return generateLetterFormPoster(params, palette, lfCtx)
  }

  return generateVerticalStack(params, palette)
}

function generateVerticalStack(params: PosterParams, palette: Palette): Poster {
  const rng = createRng(params.seed)
  const noise = createNoise2D(params.seed)

  const { canvasWidth, canvasHeight, bleedMm } = resolveCanvasDimensions(params)

  const sizes = generateWeightedSizes(params.layerCount, rng, params.experimental.enabled)
  const proportions = pickProportions(
    params.layerCount,
    params.proportionSet,
    rng,
    params.experimental.enabled,
  )

  let layers = placeLayers(sizes, proportions, params, rng, noise, canvasWidth, canvasHeight)
  layers = enforceVerticalChain(layers, params.overlapDepth, params.breathingRoom, rng)
  layers = assignColorsByWeight(layers, palette)
  layers = attachPatternParams(layers, params.pattern, rng, noise, palette)

  const typeBlocks = placeTypeBlocks(layers, params, rng)

  const background = palette.colors.find((c) => c.role === 'background')
  if (!background) throw new Error(`Palette "${palette.id}" missing background color`)

  const backgroundHex =
    params.backgroundOverride === 'transparent' ? 'transparent' : background.hex

  return {
    canvasWidth,
    canvasHeight,
    bleedMm,
    backgroundHex,
    layers,
    typeBlocks,
    seed: params.seed,
    paramsSnapshot: params,
  }
}

function resolveLetterFormFont(
  params: PosterParams,
  ctx: GenerateContext,
): opentype.Font | null {
  const source = params.letterForm.fontSource
  if (source.kind === 'uploaded') return ctx.uploadedFont ?? null
  return ctx.bundledFonts?.[source.id] ?? null
}
