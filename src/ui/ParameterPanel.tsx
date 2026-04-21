import { CanvasSection } from './sections/CanvasSection'
import { ColorSection } from './sections/ColorSection'
import { CompositionSection } from './sections/CompositionSection'
import { ExperimentalSection } from './sections/ExperimentalSection'
import { ProportionSection } from './sections/ProportionSection'
import { RotationSection } from './sections/RotationSection'
import { TypographySection } from './sections/TypographySection'

export function ParameterPanel() {
  return (
    <div className="h-full overflow-y-auto">
      <CompositionSection />
      <ProportionSection />
      <RotationSection />
      <ColorSection />
      <TypographySection />
      <CanvasSection />
      <ExperimentalSection />
    </div>
  )
}
