import type opentype from 'opentype.js'
import { TypeBlock } from '../engine/types'

export interface TextPathResult {
  d: string
  width: number
}

export function textBlockToPath(
  block: TypeBlock,
  font: opentype.Font,
): TextPathResult {
  // Measure the advance so we can handle anchoring.
  const advance = font.getAdvanceWidth(block.text, block.fontSize)
  const anchorShift =
    block.anchor === 'middle' ? -advance / 2 : block.anchor === 'end' ? -advance : 0
  const path = font.getPath(block.text, anchorShift, 0, block.fontSize)
  return { d: path.toPathData(3), width: advance }
}
