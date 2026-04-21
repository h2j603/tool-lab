import { Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import opentype from 'opentype.js'
import { useStore } from '../state/store'

export function FontUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadedFont = useStore((s) => s.uploadedFont)
  const setUploadedFont = useStore((s) => s.setUploadedFont)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const font = opentype.parse(buf)
      const familyName =
        (font.names?.fullName?.en as string | undefined) ??
        (font.names?.fontFamily?.en as string | undefined) ??
        file.name.replace(/\.[^.]+$/, '')
      setUploadedFont({ name: familyName, opentypeFont: font })
      injectFontFace(familyName, buf)
    } catch (e) {
      setError(`Failed to parse font: ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      {uploadedFont ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="truncate">
            Font: <span className="font-mono">{uploadedFont.name}</span>
          </span>
          <button
            onClick={() => setUploadedFont(null)}
            className="p-0.5 rounded hover:bg-neutral-100"
            title="Remove uploaded font"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black"
        >
          <Upload size={12} /> Upload font (.ttf / .otf)
        </button>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

const injectedFamilies = new Set<string>()

function injectFontFace(family: string, data: ArrayBuffer) {
  if (typeof document === 'undefined') return
  if (injectedFamilies.has(family)) return
  injectedFamilies.add(family)

  const blob = new Blob([data], { type: 'font/opentype' })
  const url = URL.createObjectURL(blob)
  const style = document.createElement('style')
  style.dataset.colorStackFont = family
  style.textContent = `@font-face { font-family: "${family.replace(/"/g, '\\"')}"; src: url(${url}); }`
  document.head.appendChild(style)
}
