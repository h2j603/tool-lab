import type opentype from 'opentype.js'
import { Layer, Poster, TypeBlock } from '../engine/types'
import { textBlockToPath } from './textToPath'

export interface SvgExportOptions {
  includeBleed: boolean
  convertTextToPath: boolean
  font?: opentype.Font
}

export function posterToSvg(poster: Poster, options: SvgExportOptions): string {
  const bleed = options.includeBleed ? poster.bleedMm : 0
  const totalW = poster.canvasWidth + bleed * 2
  const totalH = poster.canvasHeight + bleed * 2

  const bgRect = `<rect x="0" y="0" width="${fmt(totalW)}" height="${fmt(totalH)}" fill="${poster.backgroundHex}" />`

  const moireDefs = poster.layers
    .filter((l) => l.moire)
    .map((l, i) => moireDefsFor(l, i))
    .join('\n    ')
  const defsBlock = moireDefs ? `<defs>\n    ${moireDefs}\n  </defs>` : ''

  const inner = [
    ...poster.layers.map((l, i) => layerToSvg(l, i)),
    ...poster.typeBlocks.map((t, i) => typeBlockToSvg(t, i, options)),
  ].join('\n  ')

  const contentGroup = `<g transform="translate(${fmt(bleed)} ${fmt(bleed)})">\n  ${inner}\n</g>`

  const bleedGuide = options.includeBleed && poster.bleedMm > 0
    ? `<rect x="${fmt(bleed)}" y="${fmt(bleed)}" width="${fmt(poster.canvasWidth)}" height="${fmt(poster.canvasHeight)}" fill="none" stroke="#000" stroke-width="0.1" stroke-dasharray="2 2" opacity="0.2" />`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(totalW)}mm" height="${fmt(totalH)}mm" viewBox="0 0 ${fmt(totalW)} ${fmt(totalH)}">
  ${bgRect}
  ${defsBlock}
  ${contentGroup}
  ${bleedGuide}
</svg>`
}

function moireDefsFor(layer: Layer, index: number): string {
  const m = layer.moire!
  const dotR = m.dotRadius * m.spacing
  const half = m.spacing / 2
  const id = `layer-${index}`
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2

  // The clip path reflects the block's actual outline (including rotation/skew
  // for rectangles). The pattern-filled rect below is axis-aligned, so the grid
  // stays pinned to canvas space while the block outline is tilted.
  let clipShape: string
  if (layer.shape === 'circle') {
    clipShape = `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(layer.width / 2)}" />`
  } else {
    const transforms: string[] = []
    if (layer.rotation !== 0) transforms.push(`rotate(${fmt(layer.rotation)} ${fmt(cx)} ${fmt(cy)})`)
    if (layer.skew !== 0) transforms.push(`skewX(${fmt(layer.skew)})`)
    const transformAttr = transforms.length ? ` transform="${transforms.join(' ')}"` : ''
    clipShape = `<rect x="${fmt(layer.x)}" y="${fmt(layer.y)}" width="${fmt(layer.width)}" height="${fmt(layer.height)}"${transformAttr} />`
  }

  return `<pattern id="moire-primary-${id}" x="0" y="0" width="${fmt(m.spacing)}" height="${fmt(m.spacing)}" patternUnits="userSpaceOnUse">
      <circle cx="${fmt(half)}" cy="${fmt(half)}" r="${fmt(dotR)}" fill="${m.primaryColor}" />
    </pattern>
    <pattern id="moire-interference-${id}" x="0" y="0" width="${fmt(m.spacing)}" height="${fmt(m.spacing)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${fmt(m.angleDelta)})">
      <circle cx="${fmt(half)}" cy="${fmt(half)}" r="${fmt(dotR)}" fill="${m.interferenceColor}" />
    </pattern>
    <clipPath id="clip-${id}">
      ${clipShape}
    </clipPath>`
}

// Bounding box (axis-aligned) that contains the rotated/skewed layer outline,
// plus some padding. Used to size the pattern-filled rect inside the clip.
function layerBoundingRect(layer: Layer): { x: number; y: number; w: number; h: number } {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  if (layer.shape === 'circle') {
    const r = layer.width / 2
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }
  }
  const theta = (layer.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(theta))
  const sin = Math.abs(Math.sin(theta))
  const skewAbs = Math.abs(Math.tan((layer.skew * Math.PI) / 180))
  const w = layer.width * cos + layer.height * sin + layer.height * skewAbs
  const h = layer.width * sin + layer.height * cos
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

function layerToSvg(layer: Layer, index: number): string {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2

  if (layer.moire) {
    const id = `layer-${index}`
    const bb = layerBoundingRect(layer)
    return `<g id="${id}">
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="url(#moire-primary-${id})" clip-path="url(#clip-${id})" />
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="url(#moire-interference-${id})" clip-path="url(#clip-${id})" />
  </g>`
  }

  if (layer.shape === 'circle') {
    const r = layer.width / 2
    return `<g id="layer-${index}">
    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${layer.colorHex}" />
  </g>`
  }

  const transforms: string[] = []
  if (layer.rotation !== 0) transforms.push(`rotate(${fmt(layer.rotation)} ${fmt(cx)} ${fmt(cy)})`)
  if (layer.skew !== 0) transforms.push(`skewX(${fmt(layer.skew)})`)
  const transform = transforms.length ? ` transform="${transforms.join(' ')}"` : ''
  return `<g id="layer-${index}"${transform}>
    <rect x="${fmt(layer.x)}" y="${fmt(layer.y)}" width="${fmt(layer.width)}" height="${fmt(layer.height)}" fill="${layer.colorHex}" />
  </g>`
}

function typeBlockToSvg(block: TypeBlock, index: number, options: SvgExportOptions): string {
  const transform = block.rotation !== 0 ? ` transform="rotate(${fmt(block.rotation)} ${fmt(block.x)} ${fmt(block.y)})"` : ''

  if (options.convertTextToPath && options.font) {
    const { d } = textBlockToPath(block, options.font)
    return `<g id="type-${index}"${transform}>
    <g transform="translate(${fmt(block.x)} ${fmt(block.y)})"><path d="${d}" fill="#000" /></g>
  </g>`
  }

  const anchor =
    block.anchor === 'middle' ? 'middle' : block.anchor === 'end' ? 'end' : 'start'
  const textXmlSafe = escapeXml(block.text)
  return `<g id="type-${index}"${transform}>
    <text x="${fmt(block.x)}" y="${fmt(block.y)}" font-family="${escapeAttr(block.fontFamily)}" font-size="${fmt(block.fontSize)}" text-anchor="${anchor}" fill="#000">${textXmlSafe}</text>
  </g>`
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Math.abs(n) < 1e-4 ? '0' : Number(n.toFixed(3)).toString()
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeAttr(s: string): string {
  return escapeXml(s)
}
