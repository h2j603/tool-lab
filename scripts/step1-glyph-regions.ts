#!/usr/bin/env node
// Letter Form Step 1 validation.
// Extracts glyph regions for four test characters and emits one SVG per
// character colored by region index so the result can be inspected visually.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import opentype from 'opentype.js'

import {
  boundingBox,
  centroid,
  extractGlyphRegions,
  flattenPathToSubpaths,
  pointInPolygon,
  signedArea,
} from '../src/engine/glyphRegions'

const CANVAS_W = 300
const CANVAS_H = 400
const GLYPH_HEIGHT = CANVAS_H * 0.75

// Visually distinct colors per region index.
const REGION_COLORS = [
  '#E84A1F', // signal red
  '#1B8A3F', // forest green
  '#1A3A8A', // cobalt
  '#E8C14C', // mustard
  '#A85DC4', // plum
  '#2B2B2B', // ink
  '#15A8A8', // teal
  '#D94A94', // pink
]

function loadFont(path: string): opentype.Font {
  const buf = readFileSync(path)
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  )
}

function polygonToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  const d = [`M ${first.x.toFixed(3)} ${first.y.toFixed(3)}`]
  for (const p of rest) d.push(`L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
  d.push('Z')
  return d.join(' ')
}

interface CharTest {
  char: string
  font: opentype.Font
  fontName: string
  expectedRegions: number | string
}

function testChar(test: CharTest): { svg: string; actualRegions: number; subpathCount: number; subpathSigns: number[] } {
  const { char, font } = test

  // Raw subpath inspection for the report (before extractGlyphRegions discards holes).
  const rawPath = font.getPath(char, 0, 0, 1000)
  const subpaths = flattenPathToSubpaths(rawPath, 12)
  const signs = subpaths.map((pts) => signedArea(pts))

  const regions = extractGlyphRegions(font, char, GLYPH_HEIGHT, CANVAS_W, CANVAS_H)

  const paths = regions
    .map(
      (r, i) =>
        `  <path d="${polygonToSvgPath(r.points)}" fill="${REGION_COLORS[i % REGION_COLORS.length]}" fill-opacity="0.85" stroke="#111" stroke-width="0.4" />`,
    )
    .join('\n')

  const centroids = regions
    .map(
      (r, i) =>
        `  <circle cx="${r.centroid.x.toFixed(3)}" cy="${r.centroid.y.toFixed(3)}" r="3" fill="#000" />\n  <text x="${(r.centroid.x + 5).toFixed(3)}" y="${(r.centroid.y + 3).toFixed(3)}" font-family="Helvetica" font-size="10" fill="#000">${i}</text>`,
    )
    .join('\n')

  const label = `<text x="10" y="18" font-family="Helvetica" font-size="12" fill="#222">char "${char}" — ${regions.length} region${regions.length === 1 ? '' : 's'}  (${test.fontName})</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}mm" height="${CANVAS_H}mm" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="#F3EEE4" />
${paths}
${centroids}
  ${label}
</svg>
`
  return {
    svg,
    actualRegions: regions.length,
    subpathCount: subpaths.length,
    subpathSigns: signs,
  }
}

function main() {
  const inter = loadFont('public/fonts/Inter.ttf')
  const noto = loadFont('public/fonts/NotoSansKR.ttf')

  const tests: CharTest[] = [
    // Inter "A" is drawn as body + crossbar rectangle → 2 regions.
    { char: 'A', font: inter, fontName: 'Inter', expectedRegions: 2 },
    // "O" has outer + inner hole; centroid-containment filter keeps the outer.
    { char: 'O', font: inter, fontName: 'Inter', expectedRegions: 1 },
    // "i" stem + tittle.
    { char: 'i', font: inter, fontName: 'Inter', expectedRegions: 2 },
    // Noto's "훈" renders as 7 individual strokes (ㅎ:3 + ㅜ:2 + ㄴ:1 + dot) — 훈 has one hole inside ㅎ which is filtered.
    { char: '훈', font: noto, fontName: 'Noto Sans KR', expectedRegions: 7 },
  ]

  const outDir = resolve('out/step1')
  mkdirSync(outDir, { recursive: true })

  console.log('=== Step 1: Glyph region extraction ===\n')
  for (const t of tests) {
    const r = testChar(t)
    const file = resolve(outDir, `glyph-${t.char === '훈' ? 'hun' : t.char}.svg`)
    writeFileSync(file, r.svg, 'utf8')
    console.log(`"${t.char}" (${t.fontName})`)
    console.log(`  total subpaths: ${r.subpathCount}`)
    console.log(`  subpath signed areas: [${r.subpathSigns.map((s) => s.toFixed(0)).join(', ')}]`)
    const rawPath2 = t.font.getPath(t.char, 0, 0, 1000)
    const subs = flattenPathToSubpaths(rawPath2, 12)
    subs.forEach((sp, idx) => {
      const bb = boundingBox(sp)
      const c = centroid(sp)
      console.log(
        `    [${idx}] pts=${sp.length} area=${signedArea(sp).toFixed(0)} bbox=(${bb.x.toFixed(0)},${bb.y.toFixed(0)} ${bb.width.toFixed(0)}x${bb.height.toFixed(0)}) centroid=(${c.x.toFixed(0)},${c.y.toFixed(0)})`,
      )
    })
    // Check centroid containment between every pair.
    subs.forEach((sp, i) => {
      subs.forEach((other, j) => {
        if (i === j) return
        const c = centroid(sp)
        if (pointInPolygon(c, other)) {
          console.log(`    subpath ${i} centroid inside subpath ${j}`)
        }
      })
    })
    console.log(`  outer regions kept: ${r.actualRegions}  (expected ${t.expectedRegions})`)
    console.log(`  → ${file}\n`)
  }
}

main()
