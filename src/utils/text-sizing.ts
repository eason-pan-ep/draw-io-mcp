/**
 * Utilities for calculating text dimensions to properly size shapes.
 */

// Approximate character width in pixels (based on default Draw.io font)
const CHAR_WIDTH = 8;
// Line height in pixels
const LINE_HEIGHT = 20;
// Padding inside shapes (horizontal and vertical)
const HORIZONTAL_PADDING = 20;
const VERTICAL_PADDING = 16;
// Minimum dimensions
const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;

/**
 * Calculates the recommended width and height for a shape based on its text content.
 * Takes into account multi-line text (using \n or literal newlines) and word wrapping.
 * 
 * @param text - The text content of the shape
 * @param maxWidth - Optional maximum width before text wraps (default: 200)
 * @returns Object with recommended width and height
 */
export function calculateTextDimensions(
    text: string,
    maxWidth = 200
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
    const height = Math.max(MIN_HEIGHT, totalLines * LINE_HEIGHT + VERTICAL_PADDING);

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
 * @returns Object with final width and height
 */
export function calculateShapeDimensions(
    text: string,
    providedWidth?: number,
    providedHeight?: number
): { width: number; height: number } {
    // If both dimensions are provided, use them as-is
    if (providedWidth !== undefined && providedHeight !== undefined) {
        return { width: providedWidth, height: providedHeight };
    }

    // If only width is provided, calculate height based on that width
    if (providedWidth !== undefined) {
        const dims = calculateTextDimensions(text, providedWidth);
        return { width: providedWidth, height: dims.height };
    }

    // If only height is provided, calculate width and use provided height
    if (providedHeight !== undefined) {
        const dims = calculateTextDimensions(text);
        return { width: dims.width, height: providedHeight };
    }

    // Neither provided - calculate both
    return calculateTextDimensions(text);
}
