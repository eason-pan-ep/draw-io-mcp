/**
 * Escapes text for safe inclusion in XML.
 * Converts newlines to &#xa; which Draw.io uses for line breaks in shape text.
 * Handles both actual newline characters and literal \n strings (from JSON input).
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\\n/g, "&#xa;")  // Handle literal \n strings first
    .replace(/\n/g, "&#xa;");  // Handle actual newline characters
}

/**
 * Unescapes XML entities back to normal text.
 */
export function unescapeXml(text: string): string {
  return text
    .replace(/&#xa;/gi, "\n")  // Case-insensitive for &#xA; and &#xa;
    .replace(/&#10;/g, "\n")   // Also handle decimal entity
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
