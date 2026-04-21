import type opentype from 'opentype.js'
import { assignColorsByWeight } from './color'
import {
  enforceVerticalChain,
  generateWeightedSizes,
  pickProportions,
  placeLayers,
} from './composition'
import { extractGlyphRegions, GlyphRegion } from './glyphRegions'
import {
  allocateBlocksToRegions,
  constrainLayersToRegion,
} from './letterFormLayout'
import { attachPatternParams } from './pattern'
import { createNoise2D, createRng } from './random'
import { resolveCanvasDimensions } from './generator'
import { Layer, Palette, Poster, PosterParams } from './types'

export interface LetterFormContext {
  font: opentype.Font
}

export function generateLetterFormPoster(
  params: PosterParams,
  palette: Palette,
  ctx: LetterFormContext,
): Poster {
  const rng = createRng(params.seed)
  const noise = createNoise2D(params.seed)

  const { canvasWidth, canvasHeight, bleedMm } = resolveCanvasDimensions(params)

  const glyphHeight = canvasHeight * 0.75
  const regions = extractGlyphRegions(
    ctx.font,
    params.letterForm.text,
    glyphHeight,
    canvasWidth,
    canvasHeight,
  )
  if (regions.length === 0) {
    throw new Error(
      `Letter Form: no regions extracted for "${params.letterForm.text}"`,
    )
  }

  // Auto-raise the effective block count so every region gets at least 1.
  const effectiveBlocks = Math.max(params.layerCount, regions.length)
  const allocation = allocateBlocksToRegions(
    effectiveBlocks,
    regions,
    params.letterForm.regionBlockAllocation,
  )

  const allLayers: Layer[] = []
  regions.forEach((region, regionIndex) => {
    const allocated = allocation.get(`region-${regionIndex}`) ?? 0
    if (allocated <= 0) return

    const regionLayers = generateBlocksForRegion(
      region,
      regionIndex,
      allocated,
      params,
      rng,
      noise,
    )

    const constrained = constrainLayersToRegion(
      regionLayers,
      region,
      params.letterForm.blockCenterTolerance,
      params.blockShape,
    )

    const chained = enforceVerticalChain(
      constrained,
      params.overlapDepth,
      params.breathingRoom,
      rng,
    )

    allLayers.push(...chained)
  })

  // Rule G — color assignment spans ALL layers across ALL regions so visual
  // hierarchy (largest = dominant, smallest = accent) is preserved globally.
  const colored = assignColorsByWeight(allLayers, palette)

  // Patterns apply per-layer identically to the Vertical Stack pipeline.
  const withPatterns = attachPatternParams(colored, params.pattern, rng, noise, palette)

  const background = palette.colors.find((c) => c.role === 'background')
  if (!background) throw new Error(`Palette "${palette.id}" missing background color`)

  const backgroundHex =
    params.backgroundOverride === 'transparent' ? 'transparent' : background.hex

  return {
    canvasWidth,
    canvasHeight,
    bleedMm,
    backgroundHex,
    layers: withPatterns,
    typeBlocks: [],
    seed: params.seed,
    paramsSnapshot: params,
  }
}

// Runs the existing Vertical Stack pipeline against a region's bounding box,
// then translates the resulting layers from region-local coords to full canvas
// coords. This is the reuse point: each region becomes a mini-canvas for the
// proven stack algorithm.
function generateBlocksForRegion(
  region: GlyphRegion,
  regionIndex: number,
  blockCount: number,
  params: PosterParams,
  rng: ReturnType<typeof createRng>,
  noise: ReturnType<typeof createNoise2D>,
): Layer[] {
  const bb = region.boundingBox
  const localParams: PosterParams = {
    ...params,
    layerCount: blockCount,
    // Scale baseSize so block sizes track the region, not the full canvas.
    baseSize: Math.min(0.9, params.baseSize),
  }

  const sizes = generateWeightedSizes(blockCount, rng, params.experimental.enabled)
  const proportions = pickProportions(
    blockCount,
    params.proportionSet,
    rng,
    params.experimental.enabled,
  )

  const local = placeLayers(
    sizes,
    proportions,
    localParams,
    rng,
    noise,
    bb.width,
    bb.height,
  )

  return local.map((l, i) => ({
    ...l,
    id: `layer-r${regionIndex}-${i}`,
    x: l.x + bb.x,
    y: l.y + bb.y,
  }))
}
