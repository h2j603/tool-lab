import { useEffect, useRef } from 'react'
import opentype from 'opentype.js'
import { AllocationStrategy, BundledFontId } from '../../engine/types'
import { useStore } from '../../state/store'
import { Section } from '../primitives/Section'
import { Select } from '../primitives/Select'
import { Slider } from '../primitives/Slider'

const BUNDLED_OPTIONS: { value: BundledFontId; label: string }[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'noto-sans-kr', label: 'Noto Sans KR' },
]

export function LetterFormSection() {
  const macroMode = useStore((s) => s.params.macroMode)
  const lf = useStore((s) => s.params.letterForm)
  const update = useStore((s) => s.updateParams)
  const bundledStatus = useStore((s) => s.bundledFontStatus)
  const bundledError = useStore((s) => s.bundledFontError)
  const loadBundled = useStore((s) => s.loadBundledFonts)
  const uploaded = useStore((s) => s.uploadedFont)
  const setUploadedFont = useStore((s) => s.setUploadedFont)
  const inputRef = useRef<HTMLInputElement>(null)

  // Kick off bundled font load on first mount when Letter Form is active.
  useEffect(() => {
    if (macroMode === 'letter-form' && bundledStatus === 'idle') {
      void loadBundled()
    }
  }, [macroMode, bundledStatus, loadBundled])

  if (macroMode !== 'letter-form') return null

  const setText = (text: string) => {
    // Allow up to 4 characters (spec Section 2 recommends ≤3, Section 13
    // cross-tests uses STEM = 4).
    const trimmed = text.slice(0, 4)
    update({ letterForm: { ...lf, text: trimmed } })
  }

  const selectBundled = (id: BundledFontId) => {
    update({ letterForm: { ...lf, fontSource: { kind: 'bundled', id } } })
  }

  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer()
      const font = opentype.parse(buf)
      const name =
        (font.names?.fullName?.en as string | undefined) ??
        (font.names?.fontFamily?.en as string | undefined) ??
        file.name.replace(/\.[^.]+$/, '')
      setUploadedFont({ name, opentypeFont: font })
      update({
        letterForm: {
          ...lf,
          fontSource: { kind: 'uploaded', fileName: name },
        },
      })
    } catch {
      alert('Invalid font file. Use .ttf, .otf, .woff, or .woff2.')
    }
  }

  const isUploaded = lf.fontSource.kind === 'uploaded'
  const hasUploaded = !!uploaded

  return (
    <Section id="letter-form" title="Letter Form">
      <label className="block text-xs">
        <div className="text-neutral-600 mb-1">Text (max 4 chars)</div>
        <input
          type="text"
          value={lf.text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4}
          className="w-full border border-neutral-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-black"
        />
      </label>

      <div className="space-y-1">
        <div className="text-xs text-neutral-600">Font</div>
        <div className="flex gap-2">
          <Select<string>
            label=""
            value={isUploaded ? '__uploaded__' : lf.fontSource.kind === 'bundled' ? lf.fontSource.id : 'inter'}
            options={[
              ...BUNDLED_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ...(hasUploaded
                ? [{ value: '__uploaded__', label: `${uploaded!.name} (uploaded)` }]
                : []),
            ]}
            onChange={(v) => {
              if (v === '__uploaded__' && uploaded) {
                update({
                  letterForm: {
                    ...lf,
                    fontSource: { kind: 'uploaded', fileName: uploaded.name },
                  },
                })
              } else {
                selectBundled(v as BundledFontId)
              }
            }}
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-neutral-600 hover:text-black underline"
        >
          Upload font…
        </button>
      </div>

      {bundledStatus === 'loading' && (
        <div className="text-xs text-neutral-500 italic">Loading bundled fonts…</div>
      )}
      {bundledStatus === 'error' && (
        <div className="text-xs text-red-600">Font load failed: {bundledError}</div>
      )}

      <Select<AllocationStrategy>
        label="Allocation"
        value={lf.regionBlockAllocation}
        options={[
          { value: 'area', label: 'By area (proportional)' },
          { value: 'even', label: 'Even (~same per region)' },
        ]}
        onChange={(v) =>
          update({ letterForm: { ...lf, regionBlockAllocation: v } })
        }
      />

      <Slider
        label="Tolerance"
        value={lf.blockCenterTolerance}
        min={0}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) =>
          update({ letterForm: { ...lf, blockCenterTolerance: v } })
        }
      />
    </Section>
  )
}
