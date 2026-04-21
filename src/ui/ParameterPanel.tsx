import { CanvasSection } from './sections/CanvasSection'
import { ColorSection } from './sections/ColorSection'
import { CompositionSection } from './sections/CompositionSection'
import { ExperimentalSection } from './sections/ExperimentalSection'
import { PatternSection } from './sections/PatternSection'
import { ProportionSection } from './sections/ProportionSection'
import { RotationSection } from './sections/RotationSection'
import { TypographySection } from './sections/TypographySection'

export function ParameterPanel() {
  return (
    <div className="px-1">
      <CompositionSection />
      <ProportionSection />
      <RotationSection />
      <ColorSection />
      <PatternSection />
      <TypographySection />
      <CanvasSection />
      <ExperimentalSection />
    </div>
  )
}
