#!/usr/bin/env node
// Phase 1 headless generator. Runs the engine from Node and writes SVGs to disk.
// Usage:
//   npm run generate -- --seed=42
//   npm run generate -- --seed=1 --batch=20 --palette=risograph

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { generatePoster } from '../src/engine/generator'
import { posterToSvg } from '../src/export/svg'
import { PRESET_PALETTES } from '../src/palettes/presets'
import { DEFAULT_PARAMS } from '../src/state/defaults'

interface Args {
  seed: number
  batch: number
  palette?: string
  out?: string
}

function parseArgs(argv: string[]): Args {
  const out: Args = { seed: 42, batch: 1 }
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=')
    if (key === 'seed') out.seed = Number(value)
    else if (key === 'batch') out.batch = Number(value)
    else if (key === 'palette') out.palette = value
    else if (key === 'out') out.out = value
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
    }
    const poster = generatePoster(params, PRESET_PALETTES)
    const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
    const file = args.out && args.batch === 1
      ? resolve(args.out)
      : resolve(outDir, `poster-${String(seed).padStart(4, '0')}.svg`)
    writeFileSync(file, svg, 'utf8')
    console.log(`wrote ${file}  layers=${poster.layers.length} text=${poster.typeBlocks.length}`)
  }
}

main()
