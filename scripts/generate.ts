#!/usr/bin/env node
// Phase 1 headless generator. Runs the engine from Node and writes SVGs to disk.
// Usage:
//   npm run generate -- --seed=42
//   npm run generate -- --seed=1 --batch=20 --palette=risograph
//   npm run generate -- --seed=1 --batch=30 --shape=circle

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { generatePoster } from '../src/engine/generator'
import { BlockShape } from '../src/engine/types'
import { posterToSvg } from '../src/export/svg'
import { PRESET_PALETTES } from '../src/palettes/presets'
import { DEFAULT_PARAMS } from '../src/state/defaults'

interface Args {
  seed: number
  batch: number
  palette?: string
  out?: string
  shape?: BlockShape
  moire?: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = { seed: 42, batch: 1 }
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=')
    if (key === 'seed') out.seed = Number(value)
    else if (key === 'batch') out.batch = Number(value)
    else if (key === 'palette') out.palette = value
    else if (key === 'out') out.out = value
    else if (key === 'shape') out.shape = value as BlockShape
    else if (key === 'moire') out.moire = value !== 'false'
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  const outDir = args.out ? dirname(resolve(args.out)) : resolve('out')
  mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < args.batch; i++) {
    const seed = args.seed + i
    const params = {
      ...DEFAULT_PARAMS,
      seed,
      paletteId: args.palette ?? DEFAULT_PARAMS.paletteId,
      blockShape: args.shape ?? DEFAULT_PARAMS.blockShape,
      moire: args.moire
        ? { ...DEFAULT_PARAMS.moire, enabled: true }
        : DEFAULT_PARAMS.moire,
    }
    const poster = generatePoster(params, PRESET_PALETTES)
    const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
    const file = args.out && args.batch === 1
      ? resolve(args.out)
      : resolve(outDir, `poster-${params.blockShape[0]}-${String(seed).padStart(4, '0')}.svg`)
    writeFileSync(file, svg, 'utf8')
    console.log(`wrote ${file}  shape=${params.blockShape} layers=${poster.layers.length}`)
  }
}

main()
