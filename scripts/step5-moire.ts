#!/usr/bin/env node
// Step 5: Letter Form + Moiré. Emit "A" and "훈" as Letter Form posters with
// Moiré enabled and verify per-block pattern variation.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype from 'opentype.js'

import { generatePoster } from '../src/engine/generator'
import { PRESET_PALETTES } from '../src/palettes/presets'
import { DEFAULT_PARAMS } from '../src/state/defaults'
import { posterToSvg } from '../src/export/svg'
import { PosterParams } from '../src/engine/types'

function loadFont(path: string): opentype.Font {
  const buf = readFileSync(path)
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  )
}

function main() {
  const inter = loadFont('public/fonts/Inter.ttf')
  const noto = loadFont('public/fonts/NotoSansKR.ttf')
  const bundledFonts = { inter, 'noto-sans-kr': noto }
  const outDir = resolve('out/step5')
  mkdirSync(outDir, { recursive: true })

  const tests = [
    { text: 'A', id: 'inter' as const },
    { text: 'O', id: 'inter' as const, shape: 'circle' as const },
    { text: '훈', id: 'noto-sans-kr' as const },
  ]

  for (const t of tests) {
    const params: PosterParams = {
      ...DEFAULT_PARAMS,
      macroMode: 'letter-form',
      layerCount: 6,
      blockShape: t.shape ?? 'rectangle',
      pattern: { ...DEFAULT_PARAMS.pattern, enabled: true, type: 'moire', variation: 0.4 },
      letterForm: {
        ...DEFAULT_PARAMS.letterForm,
        text: t.text,
        fontSource: { kind: 'bundled', id: t.id },
      },
    }

    const poster = generatePoster(params, PRESET_PALETTES, { bundledFonts })
    const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
    const file = resolve(outDir, `letterform-moire-${t.text === '훈' ? 'hun' : t.text}.svg`)
    writeFileSync(file, svg, 'utf8')
    const moireLayers = poster.layers.filter((l) => l.pattern?.type === 'moire').length
    const spacings = poster.layers
      .map((l) => (l.pattern?.type === 'moire' ? l.pattern.spacing : null))
      .filter((v): v is number => v != null)
    const angles = poster.layers
      .map((l) => (l.pattern?.type === 'moire' ? l.pattern.angleDelta : null))
      .filter((v): v is number => v != null)
    const spread = (arr: number[]) => (Math.max(...arr) - Math.min(...arr)).toFixed(3)
    console.log(`wrote ${file}`)
    console.log(
      `  layers=${poster.layers.length}  moire=${moireLayers}  spacingSpread=${spread(spacings)}  angleSpread=${spread(angles)}`,
    )
  }
}

main()
