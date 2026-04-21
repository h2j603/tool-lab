import { assignColorsByWeight } from './color'
import {
  enforceVerticalChain,
  generateWeightedSizes,
  pickProportions,
  placeLayers,
} from './composition'
import { createNoise2D, createRng } from './random'
import {
  CANVAS_DIMENSIONS,
  Palette,
  Poster,
  PosterParams,
} from './types'
import { placeTypeBlocks } from './typography'

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

export function generatePoster(params: PosterParams, palettes: Palette[]): Poster {
  const rng = createRng(params.seed)
  const noise = createNoise2D(params.seed)

  const palette = palettes.find((p) => p.id === params.paletteId)
  if (!palette) throw new Error(`Palette not found: ${params.paletteId}`)

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

  const typeBlocks = placeTypeBlocks(layers, params, rng)

  const background = palette.colors.find((c) => c.role === 'background')
  if (!background) throw new Error(`Palette "${palette.id}" missing background color`)

  return {
    canvasWidth,
    canvasHeight,
    bleedMm,
    backgroundHex: background.hex,
    layers,
    typeBlocks,
    seed: params.seed,
    paramsSnapshot: params,
  }
}
