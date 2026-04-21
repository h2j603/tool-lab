#!/usr/bin/env node
// Consolidated cross-test matrix covering v0.3 → v0.6 surfaces.
// Generates 2-3 seeds per row across pattern type × block shape × macro mode.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype from 'opentype.js'

import { generatePoster } from '../src/engine/generator'
import { PRESET_PALETTES } from '../src/palettes/presets'
import { DEFAULT_PARAMS } from '../src/state/defaults'
import { posterToSvg } from '../src/export/svg'
import {
  BlockShape,
  MacroMode,
  PatternType,
  PosterParams,
} from '../src/engine/types'

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
  patternType: PatternType | 'none'
  text?: string
  fontId?: 'inter' | 'noto-sans-kr'
  seeds: number[]
  transparent?: boolean
}

function main() {
  const inter = loadFont('public/fonts/Inter.ttf')
  const noto = loadFont('public/fonts/NotoSansKR.ttf')
  const bundledFonts = { inter, 'noto-sans-kr': noto }
  const outDir = resolve('out/matrix')
  mkdirSync(outDir, { recursive: true })

  const rows: Row[] = [
    // Vertical Stack baseline × 3 pattern types × 2 shapes
    { label: 'vs-rect-moire',   macroMode: 'vertical-stack', shape: 'rectangle', patternType: 'moire',   seeds: [1, 2, 3] },
    { label: 'vs-rect-stripes', macroMode: 'vertical-stack', shape: 'rectangle', patternType: 'stripes', seeds: [1, 2, 3] },
    { label: 'vs-rect-rings',   macroMode: 'vertical-stack', shape: 'rectangle', patternType: 'rings',   seeds: [1, 2, 3] },
    { label: 'vs-circle-rings', macroMode: 'vertical-stack', shape: 'circle',    patternType: 'rings',   seeds: [1, 2, 3] },
    { label: 'vs-rock-moire',   macroMode: 'vertical-stack', shape: 'rock',      patternType: 'moire',   seeds: [1, 2, 3] },
    { label: 'vs-rock-stripes', macroMode: 'vertical-stack', shape: 'rock',      patternType: 'stripes', seeds: [1, 2, 3] },
    { label: 'vs-rock-rings',   macroMode: 'vertical-stack', shape: 'rock',      patternType: 'rings',   seeds: [1, 2, 3] },

    // Transparent background sample
    { label: 'vs-rect-moire-transparent', macroMode: 'vertical-stack', shape: 'rectangle', patternType: 'moire', seeds: [1], transparent: true },

    // Letter Form — per Section 13 of v0.6 (Rock/Stripes/Rings now available)
    { label: 'lf-rect-moire-A',   macroMode: 'letter-form', shape: 'rectangle', patternType: 'moire',   text: 'A',    fontId: 'inter',        seeds: [1, 2] },
    { label: 'lf-circle-rings-O', macroMode: 'letter-form', shape: 'circle',    patternType: 'rings',   text: 'O',    fontId: 'inter',        seeds: [1, 2] },
    { label: 'lf-rock-stripes-hun', macroMode: 'letter-form', shape: 'rock',    patternType: 'stripes', text: '훈',   fontId: 'noto-sans-kr', seeds: [1, 2] },
    { label: 'lf-rock-rings-myung', macroMode: 'letter-form', shape: 'rock',    patternType: 'rings',   text: '命',   fontId: 'noto-sans-kr', seeds: [1, 2] },
    { label: 'lf-rect-stripes-STEM', macroMode: 'letter-form', shape: 'rectangle', patternType: 'stripes', text: 'STEM', fontId: 'inter',      seeds: [1, 2] },
  ]

  let svgCount = 0
  for (const row of rows) {
    for (const seed of row.seeds) {
      const params: PosterParams = {
        ...DEFAULT_PARAMS,
        seed,
        macroMode: row.macroMode,
        blockShape: row.shape,
        backgroundOverride: row.transparent ? 'transparent' : 'palette',
        pattern: row.patternType === 'none'
          ? { ...DEFAULT_PARAMS.pattern, enabled: false }
          : { ...DEFAULT_PARAMS.pattern, enabled: true, type: row.patternType, variation: 0.3 },
        letterForm: row.text && row.fontId
          ? { ...DEFAULT_PARAMS.letterForm, text: row.text, fontSource: { kind: 'bundled', id: row.fontId } }
          : DEFAULT_PARAMS.letterForm,
      }
      const poster = generatePoster(params, PRESET_PALETTES, { bundledFonts })
      const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
      const file = resolve(outDir, `${row.label}-s${String(seed).padStart(3, '0')}.svg`)
      writeFileSync(file, svg, 'utf8')
      svgCount++
    }
  }
  console.log(`Generated ${svgCount} matrix SVGs → ${outDir}`)
}

main()
