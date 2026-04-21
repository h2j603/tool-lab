import { useMemo } from 'react'
import { generatePoster } from '../engine/generator'
import { Layer, Poster } from '../engine/types'
import { useStore } from '../state/store'

export function Canvas() {
  const params = useStore((s) => s.params)
  const allPalettes = useStore((s) => [...s.presetPalettes, ...s.customPalettes])
  const bundledFonts = useStore((s) => s.bundledFonts)
  const uploadedFont = useStore((s) => s.uploadedFont?.opentypeFont ?? undefined)

  const poster = useMemo<Poster | null>(() => {
    try {
      return generatePoster(params, allPalettes, { bundledFonts, uploadedFont })
    } catch (e) {
      console.error(e)
      return null
    }
  }, [params, allPalettes, bundledFonts, uploadedFont])

  if (!poster) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Poster could not be generated.
      </div>
    )
  }

  const bleed = poster.bleedMm
  const totalW = poster.canvasWidth + bleed * 2
  const totalH = poster.canvasHeight + bleed * 2
  const patternedLayers = poster.layers.filter((l) => l.pattern)
  const transparent = poster.backgroundHex === 'transparent'

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="max-w-full max-h-full"
        style={{ aspectRatio: `${totalW} / ${totalH}`, boxShadow: '0 6px 40px rgba(0,0,0,0.12)' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {transparent && (
            <pattern
              id="canvas-transparent-checker"
              x={0}
              y={0}
              width={8}
              height={8}
              patternUnits="userSpaceOnUse"
            >
              <rect width={8} height={8} fill="#ffffff" />
              <rect width={4} height={4} fill="#e5e5e5" />
              <rect x={4} y={4} width={4} height={4} fill="#e5e5e5" />
            </pattern>
          )}
          {patternedLayers.map((l) => (
            <PatternDefs key={l.id} layer={l} index={poster.layers.indexOf(l)} />
          ))}
        </defs>
        <rect
          x={0}
          y={0}
          width={totalW}
          height={totalH}
          fill={transparent ? 'url(#canvas-transparent-checker)' : poster.backgroundHex}
        />
        <g transform={`translate(${bleed} ${bleed})`}>
          {poster.layers.map((l, i) => (
            <LayerGroup key={l.id} layer={l} index={i} />
          ))}
          {poster.typeBlocks.map((t, i) => {
            const transform = t.rotation !== 0
              ? `rotate(${t.rotation.toFixed(3)} ${t.x.toFixed(3)} ${t.y.toFixed(3)})`
              : undefined
            return (
              <g key={t.id} id={`type-${i}`} transform={transform}>
                <text
                  x={t.x}
                  y={t.y}
                  fontFamily={t.fontFamily}
                  fontSize={t.fontSize}
                  textAnchor={t.anchor}
                  fill="#000"
                >
                  {t.text}
                </text>
              </g>
            )
          })}
        </g>
        {bleed > 0 && (
          <rect
            x={bleed}
            y={bleed}
            width={poster.canvasWidth}
            height={poster.canvasHeight}
            fill="none"
            stroke={transparent ? '#cccccc' : '#000000'}
            strokeWidth={0.2}
            strokeDasharray="2 2"
            opacity={transparent ? 0.9 : 0.2}
          />
        )}
      </svg>
    </div>
  )
}

function clipElement(layer: Layer): JSX.Element {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  if (layer.shape === 'rock' && layer.polygon) {
    const pts = layer.polygon.points.map((p) => `${p.x},${p.y}`).join(' ')
    return <polygon points={pts} />
  }
  if (layer.shape === 'circle') {
    return <circle cx={cx} cy={cy} r={layer.width / 2} />
  }
  const transforms: string[] = []
  if (layer.rotation !== 0) transforms.push(`rotate(${layer.rotation} ${cx} ${cy})`)
  if (layer.skew !== 0) transforms.push(`skewX(${layer.skew})`)
  const transform = transforms.join(' ') || undefined
  return (
    <rect
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      transform={transform}
    />
  )
}

function PatternDefs({ layer, index }: { layer: Layer; index: number }) {
  const p = layer.pattern!
  const id = `layer-${index}`
  const half = p.type === 'moire' ? p.spacing / 2 : 0

  return (
    <>
      {p.type === 'moire' && (
        <>
          <pattern
            id={`pattern-primary-${id}`}
            x={0}
            y={0}
            width={p.spacing}
            height={p.spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={half} cy={half} r={p.dotRadius} fill={p.primaryColor} />
          </pattern>
          <pattern
            id={`pattern-secondary-${id}`}
            x={0}
            y={0}
            width={p.spacing}
            height={p.spacing}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${p.angleDelta})`}
          >
            <circle cx={half} cy={half} r={p.dotRadius} fill={p.secondaryColor} />
          </pattern>
        </>
      )}
      {p.type === 'stripes' && (
        <pattern
          id={`pattern-stripes-${id}`}
          x={0}
          y={0}
          width={p.spacing}
          height={p.spacing}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${p.angle})`}
        >
          <rect x={0} y={0} width={p.spacing} height={p.thickness} fill={p.secondaryColor} />
        </pattern>
      )}
      <clipPath id={`clip-${id}`}>{clipElement(layer)}</clipPath>
    </>
  )
}

function layerBoundingRect(layer: Layer) {
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

function LayerGroup({ layer, index }: { layer: Layer; index: number }) {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  const id = `layer-${index}`
  const p = layer.pattern

  if (p) {
    const bb = layerBoundingRect(layer)
    const clipId = `url(#clip-${id})`
    if (p.type === 'moire') {
      return (
        <g id={id}>
          <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={`url(#pattern-primary-${id})`} clipPath={clipId} />
          <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={`url(#pattern-secondary-${id})`} clipPath={clipId} />
        </g>
      )
    }
    if (p.type === 'stripes') {
      return (
        <g id={id}>
          <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={p.primaryColor} clipPath={clipId} />
          <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={`url(#pattern-stripes-${id})`} clipPath={clipId} />
        </g>
      )
    }
    // rings
    const rings = []
    for (let i = 0; i < p.ringCount; i++) {
      const r = p.ringSpacing * (i + 0.5)
      rings.push(
        <circle
          key={i}
          cx={p.centerX}
          cy={p.centerY}
          r={r}
          fill="none"
          stroke={p.secondaryColor}
          strokeWidth={p.ringThickness}
        />,
      )
    }
    return (
      <g id={id}>
        <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={p.primaryColor} clipPath={clipId} />
        <g clipPath={clipId}>{rings}</g>
      </g>
    )
  }

  if (layer.shape === 'rock' && layer.polygon) {
    const pts = layer.polygon.points.map((pp) => `${pp.x},${pp.y}`).join(' ')
    return (
      <g id={id}>
        <polygon points={pts} fill={layer.colorHex} />
      </g>
    )
  }

  if (layer.shape === 'circle') {
    return (
      <g id={id}>
        <circle cx={cx} cy={cy} r={layer.width / 2} fill={layer.colorHex} />
      </g>
    )
  }

  const transforms: string[] = []
  if (layer.rotation !== 0) transforms.push(`rotate(${layer.rotation.toFixed(3)} ${cx.toFixed(3)} ${cy.toFixed(3)})`)
  if (layer.skew !== 0) transforms.push(`skewX(${layer.skew.toFixed(3)})`)
  const transform = transforms.join(' ') || undefined

  return (
    <g id={id} transform={transform}>
      <rect x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill={layer.colorHex} />
    </g>
  )
}
