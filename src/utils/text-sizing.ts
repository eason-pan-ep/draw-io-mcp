/**
 * Utilities for calculating text dimensions to properly size shapes.
 */

import type { ShapeType } from "../types.js";

// Approximate character width in pixels (based on default Draw.io font)
const CHAR_WIDTH = 8;
// Line height in pixels
const LINE_HEIGHT = 22;
// Padding inside shapes (horizontal and vertical)
const HORIZONTAL_PADDING = 20;
const VERTICAL_PADDING = 28;
// Minimum dimensions
const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;

/**
 * Multiplier applied to the computed height to account for how much of the
 * bounding box is actually usable for text in each shape type.
 * Non-rectangular shapes lose area to curves and angles.
 */
const SHAPE_PADDING_MULTIPLIER: Record<ShapeType, number> = {
    rectangle: 1.0,
    step: 1.0,
    parallelogram: 1.0,
    trapezoid: 1.0,
    cylinder: 1.3,
    hexagon: 1.5,
    triangle: 1.5,
    ellipse: 1.6,
    cloud: 1.6,
    rhombus: 1.8,
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
    maxWidth = 200,
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
