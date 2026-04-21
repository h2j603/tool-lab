#!/usr/bin/env node
// Step 8: Cross-test matrix. Generates 2-3 seeds per row for the combinations
// available in the current codebase (rectangle/circle + Moiré on/off).
// Rock shape and Rings/Stripes patterns from the spec are not implemented in
// v0.5 yet, so rows calling for those are approximated with the closest
// available combination.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype from 'opentype.js'

import { generatePoster } from '../src/engine/generator'
import { PRESET_PALETTES } from '../src/palettes/presets'
import { DEFAULT_PARAMS } from '../src/state/defaults'
import { posterToSvg } from '../src/export/svg'
import { BlockShape, MacroMode, PosterParams } from '../src/engine/types'

function loadFont(path: string): opentype.Font {
  const buf = readFileSync(path)
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  )
}

interface Row {
  label: string
  macroMode: MacroMode
  shape: BlockShape
  moire: boolean
  text?: string
  fontId?: 'inter' | 'noto-sans-kr'
  seeds: number[]
  palette?: string
}

function main() {
  const inter = loadFont('public/fonts/Inter.ttf')
  const noto = loadFont('public/fonts/NotoSansKR.ttf')
  const bundledFonts = { inter, 'noto-sans-kr': noto }
  const outDir = resolve('out/step8')
  mkdirSync(outDir, { recursive: true })

  const rows: Row[] = [
    {
      label: 'lf-rect-moire-A',
      macroMode: 'letter-form',
      shape: 'rectangle',
      moire: true,
      text: 'A',
      fontId: 'inter',
      seeds: [1, 2, 3],
    },
    {
      label: 'lf-circle-moire-O',
      macroMode: 'letter-form',
      shape: 'circle',
      moire: true,
      text: 'O',
      fontId: 'inter',
      seeds: [1, 2, 3],
    },
    {
      label: 'lf-circle-solid-hun',
      macroMode: 'letter-form',
      shape: 'circle',
      moire: false,
      text: '훈',
      fontId: 'noto-sans-kr',
      seeds: [1, 2, 3],
    },
    {
      label: 'lf-rect-moire-myung',
      macroMode: 'letter-form',
      shape: 'rectangle',
      moire: true,
      text: '命',
      fontId: 'noto-sans-kr',
      seeds: [1, 2, 3],
    },
    {
      label: 'lf-rect-moire-STEM',
      macroMode: 'letter-form',
      shape: 'rectangle',
      moire: true,
      text: 'STEM',
      fontId: 'inter',
      seeds: [1, 2, 3],
    },
    {
      label: 'vstack-rect-moire',
      macroMode: 'vertical-stack',
      shape: 'rectangle',
      moire: true,
      seeds: [1, 2, 3],
    },
  ]

  let totalLayers = 0
  for (const row of rows) {
    for (const seed of row.seeds) {
      const params: PosterParams = {
        ...DEFAULT_PARAMS,
        seed,
        macroMode: row.macroMode,
        blockShape: row.shape,
        moire: { ...DEFAULT_PARAMS.moire, enabled: row.moire, variation: 0.4 },
        letterForm: row.text && row.fontId
          ? {
              ...DEFAULT_PARAMS.letterForm,
              text: row.text,
              fontSource: { kind: 'bundled', id: row.fontId },
            }
          : DEFAULT_PARAMS.letterForm,
        paletteId: row.palette ?? DEFAULT_PARAMS.paletteId,
      }

      const poster = generatePoster(params, PRESET_PALETTES, { bundledFonts })
      const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
      const file = resolve(outDir, `${row.label}-s${String(seed).padStart(3, '0')}.svg`)
      writeFileSync(file, svg, 'utf8')
      totalLayers += poster.layers.length
      console.log(`wrote ${file}  layers=${poster.layers.length}  mode=${row.macroMode}`)
    }
  }
  console.log(`\n--- ${rows.length} rows × 3 seeds = ${rows.length * 3} SVGs, total ${totalLayers} layers ---`)
}

main()
