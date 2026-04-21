import type opentype from 'opentype.js'
import { Layer, LayerPatternData, Poster, TypeBlock } from '../engine/types'
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
  const transparent = poster.backgroundHex === 'transparent'

  const bgRect = transparent
    ? ''
    : `<rect x="0" y="0" width="${fmt(totalW)}" height="${fmt(totalH)}" fill="${poster.backgroundHex}" />`

  const defsParts: string[] = []
  for (let i = 0; i < poster.layers.length; i++) {
    const l = poster.layers[i]
    if (!l.pattern) continue
    defsParts.push(patternDefsFor(l, i))
  }
  const defsBlock = defsParts.length
    ? `<defs>\n    ${defsParts.join('\n    ')}\n  </defs>`
    : ''

  const inner = [
    ...poster.layers.map((l, i) => layerToSvg(l, i)),
    ...poster.typeBlocks.map((t, i) => typeBlockToSvg(t, i, options)),
  ].join('\n  ')

  const contentGroup = `<g transform="translate(${fmt(bleed)} ${fmt(bleed)})">\n  ${inner}\n</g>`

  const bleedGuide =
    options.includeBleed && poster.bleedMm > 0
      ? `<rect x="${fmt(bleed)}" y="${fmt(bleed)}" width="${fmt(poster.canvasWidth)}" height="${fmt(poster.canvasHeight)}" fill="none" stroke="${transparent ? '#cccccc' : '#000000'}" stroke-width="0.2" stroke-dasharray="2 2" opacity="${transparent ? '0.9' : '0.2'}" pointer-events="none" />`
      : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(totalW)}mm" height="${fmt(totalH)}mm" viewBox="0 0 ${fmt(totalW)} ${fmt(totalH)}">
  ${bgRect}
  ${defsBlock}
  ${contentGroup}
  ${bleedGuide}
</svg>`
}

function clipShapeFor(layer: Layer): string {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  if (layer.shape === 'rock' && layer.polygon) {
    const pts = layer.polygon.points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ')
    return `<polygon points="${pts}" />`
  }
  if (layer.shape === 'circle') {
    return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(layer.width / 2)}" />`
  }
  const transforms: string[] = []
  if (layer.rotation !== 0) transforms.push(`rotate(${fmt(layer.rotation)} ${fmt(cx)} ${fmt(cy)})`)
  if (layer.skew !== 0) transforms.push(`skewX(${fmt(layer.skew)})`)
  const transformAttr = transforms.length ? ` transform="${transforms.join(' ')}"` : ''
  return `<rect x="${fmt(layer.x)}" y="${fmt(layer.y)}" width="${fmt(layer.width)}" height="${fmt(layer.height)}"${transformAttr} />`
}

function patternDefsFor(layer: Layer, index: number): string {
  const p = layer.pattern!
  const id = `layer-${index}`
  const clip = `<clipPath id="clip-${id}">
      ${clipShapeFor(layer)}
    </clipPath>`

  if (p.type === 'moire') {
    const half = p.spacing / 2
    return `<pattern id="pattern-primary-${id}" x="0" y="0" width="${fmt(p.spacing)}" height="${fmt(p.spacing)}" patternUnits="userSpaceOnUse">
      <circle cx="${fmt(half)}" cy="${fmt(half)}" r="${fmt(p.dotRadius)}" fill="${p.primaryColor}" />
    </pattern>
    <pattern id="pattern-secondary-${id}" x="0" y="0" width="${fmt(p.spacing)}" height="${fmt(p.spacing)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${fmt(p.angleDelta)})">
      <circle cx="${fmt(half)}" cy="${fmt(half)}" r="${fmt(p.dotRadius)}" fill="${p.secondaryColor}" />
    </pattern>
    ${clip}`
  }

  if (p.type === 'stripes') {
    return `<pattern id="pattern-stripes-${id}" x="0" y="0" width="${fmt(p.spacing)}" height="${fmt(p.spacing)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${fmt(p.angle)})">
      <rect x="0" y="0" width="${fmt(p.spacing)}" height="${fmt(p.thickness)}" fill="${p.secondaryColor}" />
    </pattern>
    ${clip}`
  }

  // rings — no <pattern>; render ring <circle>s inline inside the clipped group
  return clip
}

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

  if (layer.pattern) {
    return patternedLayerSvg(layer, index)
  }

  if (layer.shape === 'rock' && layer.polygon) {
    const pts = layer.polygon.points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ')
    return `<g id="layer-${index}">
    <polygon points="${pts}" fill="${layer.colorHex}" />
  </g>`
  }

  if (layer.shape === 'circle') {
    return `<g id="layer-${index}">
    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(layer.width / 2)}" fill="${layer.colorHex}" />
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

function patternedLayerSvg(layer: Layer, index: number): string {
  const id = `layer-${index}`
  const bb = layerBoundingRect(layer)
  const p = layer.pattern!
  if (p.type === 'moire') {
    return `<g id="${id}">
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="url(#pattern-primary-${id})" clip-path="url(#clip-${id})" />
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="url(#pattern-secondary-${id})" clip-path="url(#clip-${id})" />
  </g>`
  }
  if (p.type === 'stripes') {
    return `<g id="${id}">
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="${p.primaryColor}" clip-path="url(#clip-${id})" />
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="url(#pattern-stripes-${id})" clip-path="url(#clip-${id})" />
  </g>`
  }
  // rings
  const circles: string[] = []
  for (let i = 0; i < p.ringCount; i++) {
    const r = p.ringSpacing * (i + 0.5)
    circles.push(
      `<circle cx="${fmt(p.centerX)}" cy="${fmt(p.centerY)}" r="${fmt(r)}" fill="none" stroke="${p.secondaryColor}" stroke-width="${fmt(p.ringThickness)}" />`,
    )
  }
  return `<g id="${id}">
    <rect x="${fmt(bb.x)}" y="${fmt(bb.y)}" width="${fmt(bb.w)}" height="${fmt(bb.h)}" fill="${p.primaryColor}" clip-path="url(#clip-${id})" />
    <g clip-path="url(#clip-${id})">
      ${circles.join('\n      ')}
    </g>
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

export type { LayerPatternData }
