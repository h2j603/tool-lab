# color-stack — Feedback & Next Iteration

> This document describes changes to the existing color-stack implementation.
> Read the existing codebase first. Do not rewrite from scratch.
> Apply changes incrementally in the order specified in Section 5.

-----

## 1. Summary of Feedback from Phase 1 Review

The current implementation produces results that look "generic" — rectangles that any designer could assemble manually in Figma within minutes. The tool needs to produce something that **only an algorithm can produce**. This iteration introduces a **dual-layer paradigm** that makes each block internally complex, alongside fixes to the macro composition rules.

Three categories of change, in priority order:

1. **Fix stacking rules** (A, C, D) — the current output has floating blocks and extreme proportions that break the poster's structural integrity.
1. **Add circular blocks** as an alternative to rectangles, selected globally per poster.
1. **Add Moiré interference as an internal fill pattern** for blocks — this is the feature that gives the tool its identity.

Typography is deferred. Do not implement typography in this iteration.

-----

## 2. Macro Rule Fixes (Priority 1)

See source for full spec. Summary:

- Rule D: hard vertical-chain overlap; replace `overlapDensity` with `overlapDepth`; add `breathingRoom`
- Rule C: drop 5 from classical set; enforce minimum side length via `MIN_SIDE_RATIO`
- Rule A: sine + noise x-jitter (zigzag rhythm)
- Rule E: reduce rotation defaults/ranges (±12° global, ±5° local, ±4° skew, default tilt 4°)
- Layer count: 2..6, default 4

## 3. Circular Blocks (Priority 2)

- Global `blockShape: 'rectangle' | 'circle'`
- Circles: diameter from Fibonacci weight; circle-distance overlap; rotation disabled

## 4. Moiré Fill Pattern (Priority 3 — identity feature)

- Dual dot-grid `<pattern>`s rotated by `angleDelta`
- Per-block variation of spacing/angle/dot radius
- `patternUnits="userSpaceOnUse"` with canvas-origin grid
- Clip path = block shape

## 5. Implementation Order

1. Rule fixes (macro) — Section 2
2. Circular blocks — Section 3
3. Moiré single-block POC — Section 4 subset
4. Moiré full integration
5. Moiré + circles combination

## 6. Success Criteria

- Zero floating blocks; every pair in vertical chain connected
- Per-poster shape choice (rect or circle)
- Moiré produces distinct interference per block, varying coherently
- Figma import reveals pattern as thousands of editable dots
- Circle + Moiré + moderate variation produces unmistakably algorithmic output

## 8. Out of Scope

Typography (deferred to v0.3), alternative macro forms, alternative micro patterns,
rule editor, mixed shapes, animation.
