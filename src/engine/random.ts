import seedrandom from 'seedrandom'
import { createNoise2D as createSimplex2D } from 'simplex-noise'

export type RNG = () => number
export type NoiseFn = (x: number, y: number) => number

export function createRng(seed: number): RNG {
  return seedrandom(String(seed))
}

export function createNoise2D(seed: number): NoiseFn {
  const rng = createRng(seed + 9999)
  return createSimplex2D(rng)
}

export function noise1D(noise: NoiseFn, i: number, scale: number): number {
  return noise(i * scale, 0)
}

export function rngRange(rng: RNG, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function rngInt(rng: RNG, min: number, maxInclusive: number): number {
  return Math.floor(rngRange(rng, min, maxInclusive + 1))
}

export function rngPick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
