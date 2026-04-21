import { describe, expect, it } from 'vitest'
import { generateWeightedSizes, pickProportions, PROPORTION_SETS } from '../composition'
import { createRng } from '../random'

describe('experimental flags', () => {
  it('generateWeightedSizes: experimental produces near-equal sizes', () => {
    const off = generateWeightedSizes(5, createRng(3), false)
    const on = generateWeightedSizes(5, createRng(3), true)
    const range = (arr: number[]) => Math.max(...arr) - Math.min(...arr)
    expect(range(on)).toBeLessThan(range(off))
  })

  it('pickProportions: experimental escapes the restricted set', () => {
    const free = pickProportions(30, 'classical', createRng(11), true)
    const allowed = new Set<number>([
      ...PROPORTION_SETS.classical,
      ...PROPORTION_SETS.classical.map((v) => 1 / v),
    ])
    const outOfSet = free.filter(
      (r) => ![...allowed].some((a) => Math.abs(a - r) < 1e-6),
    )
    expect(outOfSet.length).toBeGreaterThan(0)
  })
})
