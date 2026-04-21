// v0.4 introduced a unified pattern system in `pattern.ts`. This file is now a
// thin compatibility shim that re-exports the legacy Moiré symbols from there
// so older imports (tests, external callers) keep working.
export {
  attachPatternParams as attachMoireParams,
  darkenHex,
  deriveMoireData as deriveMoireParamsForLayer,
  resolveSecondaryColor as resolveInterferenceColor,
} from './pattern'
