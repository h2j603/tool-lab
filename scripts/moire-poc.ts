#!/usr/bin/env node
// Phase 3 POC for the Moiré fill pattern.
// Emits a test SVG with four panels at different angle deltas so the
// visual effect can be inspected in Figma / Illustrator before
// integrating into the main engine.

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Panel {
  id: string
  x: number
  y: number
  width: number
  height: number
  primary: string
  interference: string
  angleDelta: number  // degrees
  spacing: number     // mm
  dotRadius: number   // fraction of spacing
}

const PANELS: Panel[] = [
  {
    id: 'p05',
    x: 20, y: 20, width: 120, height: 150,
    primary: '#1B8A3F', interference: '#0F4A22',
    angleDelta: 0.5, spacing: 2, dotRadius: 0.35,
  },
  {
    id: 'p2',
    x: 160, y: 20, width: 120, height: 150,
    primary: '#1B8A3F', interference: '#0F4A22',
    angleDelta: 2, spacing: 2, dotRadius: 0.35,
  },
  {
    id: 'p5',
    x: 20, y: 190, width: 120, height: 150,
    primary: '#1B8A3F', interference: '#0F4A22',
    angleDelta: 5, spacing: 2, dotRadius: 0.35,
  },
  {
    id: 'p10',
    x: 160, y: 190, width: 120, height: 150,
    primary: '#1B8A3F', interference: '#0F4A22',
    angleDelta: 10, spacing: 2, dotRadius: 0.35,
  },
]

const CANVAS_W = 300
const CANVAS_H = 360

function panelDefs(p: Panel): string {
  const dotR = (p.dotRadius * p.spacing).toFixed(3)
  const half = (p.spacing / 2).toFixed(3)
  return `  <pattern id="moire-primary-${p.id}" x="0" y="0" width="${p.spacing}" height="${p.spacing}" patternUnits="userSpaceOnUse">
    <circle cx="${half}" cy="${half}" r="${dotR}" fill="${p.primary}" />
  </pattern>
  <pattern id="moire-interference-${p.id}" x="0" y="0" width="${p.spacing}" height="${p.spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(${p.angleDelta})">
    <circle cx="${half}" cy="${half}" r="${dotR}" fill="${p.interference}" />
  </pattern>
  <clipPath id="clip-${p.id}">
    <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" />
  </clipPath>`
}

function panelFill(p: Panel): string {
  return `  <g>
    <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="url(#moire-primary-${p.id})" clip-path="url(#clip-${p.id})" />
    <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="url(#moire-interference-${p.id})" clip-path="url(#clip-${p.id})" />
    <text x="${p.x + 4}" y="${p.y + p.height - 4}" font-family="Helvetica, Arial, sans-serif" font-size="6" fill="#ffffff">Δθ = ${p.angleDelta}°</text>
  </g>`
}

function main() {
  const defs = PANELS.map(panelDefs).join('\n')
  const fills = PANELS.map(panelFill).join('\n')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}mm" height="${CANVAS_H}mm" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="#F3EEE4" />
  <defs>
${defs}
  </defs>
${fills}
</svg>
`

  const outDir = resolve('out')
  mkdirSync(outDir, { recursive: true })
  const out = resolve(outDir, 'moire-poc.svg')
  writeFileSync(out, svg, 'utf8')
  console.log(`wrote ${out}`)
  console.log('Panels: Δθ = 0.5°, 2°, 5°, 10°')
}

main()
