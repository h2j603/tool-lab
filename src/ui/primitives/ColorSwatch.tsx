interface ColorSwatchProps {
  hex: string
  size?: number
  onClick?: () => void
  title?: string
}

export function ColorSwatch({ hex, size = 18, onClick, title }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? hex}
      style={{ width: size, height: size, background: hex }}
      className="border border-neutral-300 rounded-sm shrink-0 hover:border-black transition-colors"
    />
  )
}
