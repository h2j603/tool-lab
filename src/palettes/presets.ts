import { Palette } from '../engine/types'

export const PRESET_PALETTES: Palette[] = [
  {
    id: 'strelka',
    name: 'Strelka',
    character: 'Institutional, grounded, with a green pulse',
    isCustom: false,
    colors: [
      { hex: '#1B8A3F', role: 'dominant', label: 'Forest Green' },
      { hex: '#2B2B2B', role: 'secondary', label: 'Ink' },
      { hex: '#D9D4CB', role: 'secondary', label: 'Paper' },
      { hex: '#E84A1F', role: 'accent', label: 'Signal' },
      { hex: '#F3EEE4', role: 'background', label: 'Canvas' },
    ],
  },
  {
    id: 'cool-grid',
    name: 'Cool Grid',
    character: 'Bauhaus-flavored, crisp, editorial',
    isCustom: false,
    colors: [
      { hex: '#1A3A8A', role: 'dominant', label: 'Cobalt' },
      { hex: '#D6D2C3', role: 'secondary', label: 'Stone' },
      { hex: '#1F1F1F', role: 'secondary', label: 'Black' },
      { hex: '#E8C14C', role: 'accent', label: 'Mustard' },
      { hex: '#F6F1E5', role: 'background', label: 'Cream' },
    ],
  },
  {
    id: 'risograph',
    name: 'Risograph',
    character: 'Warm, layered, print-shop energy',
    isCustom: false,
    colors: [
      { hex: '#E5413E', role: 'dominant', label: 'Riso Red' },
      { hex: '#1E63A5', role: 'secondary', label: 'Federal Blue' },
      { hex: '#F2B134', role: 'secondary', label: 'Yellow' },
      { hex: '#1F1F1F', role: 'accent', label: 'Carbon' },
      { hex: '#FCEFD5', role: 'background', label: 'Newsprint' },
    ],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    character: 'Disciplined contrast, all voice, no volume',
    isCustom: false,
    colors: [
      { hex: '#111111', role: 'dominant', label: 'Black' },
      { hex: '#6D6D6D', role: 'secondary', label: 'Graphite' },
      { hex: '#C7C7C7', role: 'secondary', label: 'Fog' },
      { hex: '#FF3D2E', role: 'accent', label: 'Alarm' },
      { hex: '#FFFFFF', role: 'background', label: 'Paper' },
    ],
  },
  {
    id: 'night-campus',
    name: 'Night Campus',
    character: 'After-hours, neon on concrete',
    isCustom: false,
    colors: [
      { hex: '#0C1A2B', role: 'dominant', label: 'Deep Night' },
      { hex: '#2E8A7B', role: 'secondary', label: 'Mint Arc' },
      { hex: '#D8D3C5', role: 'secondary', label: 'Concrete' },
      { hex: '#F2C744', role: 'accent', label: 'Lamp' },
      { hex: '#14202E', role: 'background', label: 'Midnight' },
    ],
  },
]

export function getPresetById(id: string): Palette | undefined {
  return PRESET_PALETTES.find((p) => p.id === id)
}
