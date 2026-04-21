export const TRANSPARENT = 'transparent' as const

export function isTransparent(hex: string): boolean {
  return hex === TRANSPARENT
}
