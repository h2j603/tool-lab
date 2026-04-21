#!/usr/bin/env node
// Step 4 validation: full Letter Form generator headless run.
// For each test character, emits one SVG poster whose blocks cluster inside
// the glyph outline. Also emits a "wireframe" SVG overlaying the glyph region
// polygons atop the blocks so region membership is visually verifiable.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype from 'opentype.js'

import { generatePoster } from '../src/engine/generator'
import { extractGlyphRegions } from '../src/engine/glyphRegions'
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

  const outDir = resolve('out/step4')
  mkdirSync(outDir, { recursive: true })

  const tests = [
    { text: 'A', id: 'inter' as const },
    { text: 'O', id: 'inter' as const },
    { text: '훈', id: 'noto-sans-kr' as const },
  ]

  for (const t of tests) {
    const params: PosterParams = {
      ...DEFAULT_PARAMS,
      macroMode: 'letter-form',
      layerCount: 6,
      letterForm: {
        ...DEFAULT_PARAMS.letterForm,
        text: t.text,
        fontSource: { kind: 'bundled', id: t.id },
      },
    }

    const poster = generatePoster(params, PRESET_PALETTES, { bundledFonts })
    const svg = posterToSvg(poster, { includeBleed: true, convertTextToPath: false })
    const file = resolve(outDir, `letterform-${t.text === '훈' ? 'hun' : t.text}.svg`)
    writeFileSync(file, svg, 'utf8')
    console.log(`wrote ${file}  layers=${poster.layers.length}`)

    // Region containment audit.
    const { canvasWidth, canvasHeight } = poster
    const regions = extractGlyphRegions(
      t.id === 'inter' ? inter : noto,
      t.text,
      canvasHeight * 0.75,
      canvasWidth,
      canvasHeight,
    )
    const inside = poster.layers.filter((l) => {
      const cx = l.x + l.width / 2
      const cy = l.y + l.height / 2
      return regions.some((r) =>
        pointInPolygon({ x: cx, y: cy }, r.points, 1),
      )
    }).length
    console.log(`  block centers inside regions: ${inside} / ${poster.layers.length}`)
  }
}

function pointInPolygon(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
  tolPad: number,
): boolean {
  // Minor tolerance so a center snapped to an edge still counts.
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y
    const xj = poly[j].x,
      yj = poly[j].y
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  if (inside) return true
  // Fallback: distance to nearest edge
  let minD = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const apx = p.x - a.x
    const apy = p.y - a.y
    const len2 = abx * abx + aby * aby || 1
    let t = (apx * abx + apy * aby) / len2
    t = Math.max(0, Math.min(1, t))
    const qx = a.x + abx * t
    const qy = a.y + aby * t
    const d = Math.hypot(p.x - qx, p.y - qy)
    if (d < minD) minD = d
  }
  return minD <= tolPad
}

main()
