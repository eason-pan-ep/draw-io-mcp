/**
 * Utilities for calculating text dimensions to properly size shapes.
 */

import type { ShapeType } from "../types.js";

// Character width in pixels for 12px sans-serif (Draw.io default).
// 7.5px is a slightly conservative average for mixed-case English text;
// combined with HORIZONTAL_PADDING it prevents overflow without making shapes excessively wide.
const CHAR_WIDTH = 7.5;
// Line height in pixels (22px is conservative for 12px font; errs on the side of more space)
const LINE_HEIGHT = 24;
// Shape border → text area gaps.
// spacingLeft=8 + spacingRight=8 (set in style-generator.ts) consume 16px of horizontal width.
// spacingTop=6 + spacingBottom=6 consume 12px of vertical height.
// These constants must be at least that large plus a comfortable buffer.
const HORIZONTAL_PADDING = 52; // 16px consumed by spacing + 36px true buffer
const VERTICAL_PADDING = 28;   // 12px consumed by spacing + 16px true buffer
// Minimum dimensions
const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;

/**
 * Multiplier applied to the computed height to account for how much of the
 * bounding box is actually usable for text in each shape type.
 * Non-rectangular shapes lose area to curves and angles.
 */
const SHAPE_PADDING_MULTIPLIER: Record<ShapeType, number> = {
    rectangle: 1.05,   // Small buffer for text rendering variance
    step: 1.1,         // Slight offset from step cutout
    parallelogram: 1.15,
    trapezoid: 1.15,
    cylinder: 1.3,     // Top cap reduces usable area
    hexagon: 1.3,
    triangle: 1.6,     // Only ~60% of bbox is usable
    ellipse: 1.4,      // Inscribed rectangle is ~70% of bbox
    cloud: 1.5,
    rhombus: 1.8,      // Inscribed rectangle is ~50% of bbox
};

/**
 * Calculates the recommended width and height for a shape based on its text content.
 * Takes into account multi-line text (using \n or literal newlines) and word wrapping.
 *
 * @param text - The text content of the shape
 * @param maxWidth - Optional maximum width before text wraps (default: 200)
 * @param shapeType - Optional shape type to apply geometry-aware height padding
 * @returns Object with recommended width and height
 */
export function calculateTextDimensions(
    text: string,
    maxWidth = 320,
    shapeType?: ShapeType
): { width: number; height: number } {
    // Normalize newlines: handle both literal \n strings and actual newline characters
    const normalizedText = text.replace(/\\n/g, "\n");
    const lines = normalizedText.split("\n");

    // Find the longest line and calculate dimensions
    let maxLineWidth = 0;
    let totalLines = 0;

    for (const line of lines) {
        const lineWidth = line.length * CHAR_WIDTH;

        if (lineWidth > maxWidth - HORIZONTAL_PADDING) {
            // Line needs to wrap - calculate how many wrapped lines
            const effectiveMaxWidth = maxWidth - HORIZONTAL_PADDING;
            const wrappedLines = Math.ceil(lineWidth / effectiveMaxWidth);
            totalLines += wrappedLines;
            maxLineWidth = Math.max(maxLineWidth, effectiveMaxWidth);
        } else {
            totalLines += 1;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
        }
    }

    // Calculate final dimensions with padding
    const width = Math.max(MIN_WIDTH, maxLineWidth + HORIZONTAL_PADDING);
    const multiplier = shapeType ? (SHAPE_PADDING_MULTIPLIER[shapeType] ?? 1.0) : 1.0;
    const height = Math.max(MIN_HEIGHT, Math.ceil((totalLines * LINE_HEIGHT + VERTICAL_PADDING) * multiplier));

    return { width, height };
}

/**
 * Calculates dimensions that fit the text content, respecting user-provided values.
 * If the user provides a width, the height will be calculated to fit the text at that width.
 * If the user provides both width and height, those values are used as-is.
 *
 * @param text - The text content of the shape
 * @param providedWidth - User-provided width (optional)
 * @param providedHeight - User-provided height (optional)
 * @param shapeType - Shape type for geometry-aware height padding (optional)
 * @returns Object with final width and height
 */
export function calculateShapeDimensions(
    text: string,
    providedWidth?: number,
    providedHeight?: number,
    shapeType?: ShapeType
): { width: number; height: number } {
    // If both dimensions are provided, use them as-is
    if (providedWidth !== undefined && providedHeight !== undefined) {
        return { width: providedWidth, height: providedHeight };
    }

    // If only width is provided, calculate height based on that width
    if (providedWidth !== undefined) {
        const dims = calculateTextDimensions(text, providedWidth, shapeType);
        return { width: providedWidth, height: dims.height };
    }

    // If only height is provided, calculate width and use provided height
    if (providedHeight !== undefined) {
        const dims = calculateTextDimensions(text, undefined, shapeType);
        return { width: dims.width, height: providedHeight };
    }

    // Neither provided - calculate both
    return calculateTextDimensions(text, undefined, shapeType);
}
