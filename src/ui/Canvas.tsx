import { useMemo } from 'react'
import { generatePoster } from '../engine/generator'
import { Layer, Poster } from '../engine/types'
import { useStore } from '../state/store'

export function Canvas() {
  const params = useStore((s) => s.params)
  const allPalettes = useStore((s) => [...s.presetPalettes, ...s.customPalettes])

  const poster = useMemo<Poster | null>(() => {
    try {
      return generatePoster(params, allPalettes)
    } catch (e) {
      console.error(e)
      return null
    }
  }, [params, allPalettes])

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
  const moireLayers = poster.layers.filter((l) => l.moire)

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="max-w-full max-h-full"
        style={{ aspectRatio: `${totalW} / ${totalH}`, boxShadow: '0 6px 40px rgba(0,0,0,0.12)' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x={0} y={0} width={totalW} height={totalH} fill={poster.backgroundHex} />
        {moireLayers.length > 0 && (
          <defs>
            {moireLayers.map((l) => (
              <MoireDefs key={l.id} layer={l} />
            ))}
          </defs>
        )}
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
            stroke="#000"
            strokeWidth={0.1}
            strokeDasharray="2 2"
            opacity={0.2}
          />
        )}
      </svg>
    </div>
  )
}

function MoireDefs({ layer }: { layer: Layer }) {
  const m = layer.moire!
  const dotR = m.dotRadius * m.spacing
  const half = m.spacing / 2
  const id = layer.id
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2

  let clip: JSX.Element
  if (layer.shape === 'circle') {
    clip = <circle cx={cx} cy={cy} r={layer.width / 2} />
  } else {
    const transforms: string[] = []
    if (layer.rotation !== 0) transforms.push(`rotate(${layer.rotation} ${cx} ${cy})`)
    if (layer.skew !== 0) transforms.push(`skewX(${layer.skew})`)
    const transform = transforms.join(' ') || undefined
    clip = (
      <rect
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        transform={transform}
      />
    )
  }

  return (
    <>
      <pattern
        id={`moire-primary-${id}`}
        x={0}
        y={0}
        width={m.spacing}
        height={m.spacing}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={half} cy={half} r={dotR} fill={m.primaryColor} />
      </pattern>
      <pattern
        id={`moire-interference-${id}`}
        x={0}
        y={0}
        width={m.spacing}
        height={m.spacing}
        patternUnits="userSpaceOnUse"
        patternTransform={`rotate(${m.angleDelta})`}
      >
        <circle cx={half} cy={half} r={dotR} fill={m.interferenceColor} />
      </pattern>
      <clipPath id={`clip-${id}`}>{clip}</clipPath>
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
  const hasMoire = !!layer.moire
  const id = `layer-${index}`

  if (hasMoire) {
    const bb = layerBoundingRect(layer)
    return (
      <g id={id}>
        <rect
          x={bb.x}
          y={bb.y}
          width={bb.w}
          height={bb.h}
          fill={`url(#moire-primary-${layer.id})`}
          clipPath={`url(#clip-${layer.id})`}
        />
        <rect
          x={bb.x}
          y={bb.y}
          width={bb.w}
          height={bb.h}
          fill={`url(#moire-interference-${layer.id})`}
          clipPath={`url(#clip-${layer.id})`}
        />
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
