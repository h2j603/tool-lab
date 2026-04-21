import { Download } from 'lucide-react'
import { useState } from 'react'
import { generatePoster } from '../engine/generator'
import { posterToSvg } from '../export/svg'
import { useStore } from '../state/store'

export function ExportBar() {
  const params = useStore((s) => s.params)
  const allPalettes = useStore((s) => [...s.presetPalettes, ...s.customPalettes])
  const uploadedFont = useStore((s) => s.uploadedFont)
  const [includeBleed, setIncludeBleed] = useState(true)
  const [textToPath, setTextToPath] = useState(false)

  const download = () => {
    const poster = generatePoster(params, allPalettes)
    const canConvert = textToPath && !!uploadedFont
    const svg = posterToSvg(poster, {
      includeBleed,
      convertTextToPath: canConvert,
      font: uploadedFont?.opentypeFont,
    })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `color-stack-${params.seed}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div
      className="p-4 border-t border-neutral-200 bg-white space-y-3 shrink-0"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <label className="flex items-center gap-2.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={includeBleed}
          onChange={(e) => setIncludeBleed(e.target.checked)}
          className="accent-black w-4 h-4"
        />
        <span>Include bleed</span>
      </label>
      <label className="flex items-center gap-2.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={textToPath}
          onChange={(e) => setTextToPath(e.target.checked)}
          disabled={!uploadedFont}
          className="accent-black w-4 h-4 disabled:opacity-40"
        />
        <span className={uploadedFont ? '' : 'text-neutral-400'}>
          Convert text to paths
          {!uploadedFont && <span className="italic"> — upload font</span>}
        </span>
      </label>
      <button
        onClick={download}
        className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-medium py-3 rounded hover:bg-neutral-800 active:bg-neutral-700 transition-colors"
      >
        <Download size={16} />
        Export SVG
      </button>
    </div>
  )
}
