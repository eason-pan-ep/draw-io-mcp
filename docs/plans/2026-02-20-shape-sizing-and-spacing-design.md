# Design: Shape Sizing and Spacing Improvements

**Date:** 2026-02-20
**Branch:** improve-layout

## Problem

Two readability issues were identified:

1. **Text overflow (top/bottom):** Text content clips beyond the top and bottom edges of shapes. This affects all shape types, including rectangles.
2. **Tight spacing:** The default gap between shapes in auto-layout is too small, making diagrams feel cramped and hard to read.

## Root Causes

**Text overflow** — `src/utils/text-sizing.ts` uses constants that underestimate Draw.io's actual text rendering:
- `VERTICAL_PADDING = 16` (8px per side) is insufficient for Draw.io's internal text container
- `LINE_HEIGHT = 20` slightly underestimates rendered line height
- No adjustment is made for non-rectangular shapes (ellipse, rhombus, etc.) whose usable text area is smaller than their bounding box

**Tight spacing** — `src/tools/auto-layout.ts` defaults to `spacing = 50`, which is too small, especially as shapes grow larger due to auto-sizing.

## Chosen Approach: Shape-Aware Padding + Spacing Bump

### Section 1: Shape-Aware Text Sizing (`src/utils/text-sizing.ts`)

**Constant changes:**
- `LINE_HEIGHT`: 20 → 22
- `VERTICAL_PADDING`: 16 → 28

**New `SHAPE_PADDING_MULTIPLIER` map** applied to computed height:

| Shape types | Multiplier | Reason |
|---|---|---|
| rectangle, step, parallelogram, trapezoid | 1.0x | Full bounding box is usable |
| cylinder | 1.3x | Top/bottom arcs reduce text area |
| hexagon, triangle | 1.5x | Angled edges cut into text area |
| ellipse, cloud | 1.6x | Curved edges reduce usable center |
| rhombus | 1.8x | Diamond center is narrow |

**API changes:**
- `calculateTextDimensions(text, maxWidth?, shapeType?)` — add optional `shapeType` parameter; applies multiplier to computed height
- `calculateShapeDimensions(text, providedWidth?, providedHeight?, shapeType?)` — pass `shapeType` through to `calculateTextDimensions`
- `addShape()` in `src/tools/add-shape.ts` — pass `shapeType` into `calculateShapeDimensions`

### Section 2: Layout Spacing (`src/tools/auto-layout.ts`)

- Default `spacing` parameter: 50 → 80px
- Update tool description example to reflect new default

## Files Changed

| File | Change |
|---|---|
| `src/utils/text-sizing.ts` | Increase constants, add multiplier map, update function signatures |
| `src/tools/add-shape.ts` | Pass `shapeType` to `calculateShapeDimensions` |
| `src/tools/auto-layout.ts` | Default spacing 50 → 80, update description |

## Non-Goals

- No changes to layout algorithms
- No changes to XML output format
- No new files
- Callers passing explicit `spacing` values are unaffected
