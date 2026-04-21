import { useMemo } from 'react'
import { generatePoster } from '../engine/generator'
import { Poster } from '../engine/types'
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
        <g transform={`translate(${bleed} ${bleed})`}>
          {poster.layers.map((l, i) => {
            const cx = l.x + l.width / 2
            const cy = l.y + l.height / 2
            const transforms: string[] = []
            if (l.rotation !== 0) transforms.push(`rotate(${l.rotation.toFixed(3)} ${cx.toFixed(3)} ${cy.toFixed(3)})`)
            if (l.skew !== 0) transforms.push(`skewX(${l.skew.toFixed(3)})`)
            return (
              <g key={l.id} id={`layer-${i}`} transform={transforms.join(' ') || undefined}>
                <rect x={l.x} y={l.y} width={l.width} height={l.height} fill={l.colorHex} />
              </g>
            )
          })}
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
