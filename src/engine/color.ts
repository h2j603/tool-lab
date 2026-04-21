import { Layer, Palette } from './types'

export function assignColorsByWeight(layers: Layer[], palette: Palette): Layer[] {
  const dominant = palette.colors.find((c) => c.role === 'dominant')
  const secondaries = palette.colors.filter((c) => c.role === 'secondary')
  const accent = palette.colors.find((c) => c.role === 'accent')
  if (!dominant || !accent) throw new Error(`Palette "${palette.id}" missing dominant/accent roles`)

  const sortedByArea = [...layers].sort((a, b) => b.area - a.area)
  const assignments = new Map<string, string>()

  sortedByArea.forEach((layer, i) => {
    if (i === 0) {
      assignments.set(layer.id, dominant.hex)
    } else if (i === sortedByArea.length - 1) {
      assignments.set(layer.id, accent.hex)
    } else if (secondaries.length > 0) {
      const idx = (i - 1) % secondaries.length
      assignments.set(layer.id, secondaries[idx].hex)
    } else {
      assignments.set(layer.id, dominant.hex)
    }
  })

  return layers.map((l) => ({ ...l, colorHex: assignments.get(l.id) ?? l.colorHex }))
}

export function validatePalette(palette: Palette): string[] {
  const errors: string[] = []
  const roles = palette.colors.map((c) => c.role)
  if (!roles.includes('dominant')) errors.push('Palette must contain a dominant color')
  if (!roles.includes('secondary')) errors.push('Palette must contain a secondary color')
  if (!roles.includes('accent')) errors.push('Palette must contain an accent color')
  if (!roles.includes('background')) errors.push('Palette must contain a background color')
  if (palette.colors.length < 3) errors.push('Palette must have at least 3 colors')
  return errors
}
