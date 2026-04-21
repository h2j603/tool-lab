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
  ${contentGroup}
  ${bleedGuide}
</svg>`
}

function layerToSvg(layer: Layer, index: number): string {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2

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
