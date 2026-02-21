/**
 * Parses Draw.io diagram XML into a structured graph representation
 */

export interface ParsedShape {
  id: string;
  text: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface DiagramGraph {
  shapes: Map<string, ParsedShape>;
  edges: ParsedEdge[];
  // Adjacency lists for graph traversal
  outgoing: Map<string, string[]>; // shape id -> target shape ids
  incoming: Map<string, string[]>; // shape id -> source shape ids
}

/**
 * Parse a Draw.io XML file content into a graph structure
 */
export function parseDiagram(content: string): DiagramGraph {
  const shapes = new Map<string, ParsedShape>();
  const edges: ParsedEdge[] = [];
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  // Parse shapes (vertex="1")
  // Match mxCell with vertex="1" and extract geometry
  const shapeRegex =
    /<mxCell[^>]*id="([^"]*)"[^>]*value="([^"]*)"[^>]*style="([^"]*)"[^>]*vertex="1"[^>]*>[\s\S]*?<mxGeometry[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"[^>]*\/>/g;

  let match;
  while ((match = shapeRegex.exec(content)) !== null) {
    const [, id, value, style, x, y, width, height] = match;

    let shapeType = "rectangle";
    if (style.includes("ellipse")) shapeType = "ellipse";
    else if (style.includes("rhombus")) shapeType = "rhombus";
    else if (style.includes("cylinder")) shapeType = "cylinder";
    else if (style.includes("hexagon")) shapeType = "hexagon";
    else if (style.includes("cloud")) shapeType = "cloud";
    else if (style.includes("parallelogram")) shapeType = "parallelogram";
    else if (style.includes("trapezoid")) shapeType = "trapezoid";
    else if (style.includes("triangle")) shapeType = "triangle";

    shapes.set(id, {
      id,
      text: value,
      type: shapeType,
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
    });

    // Initialize adjacency lists
    outgoing.set(id, []);
    incoming.set(id, []);
  }

  // Parse edges (edge="1")
  const edgeRegex =
    /<mxCell[^>]*id="([^"]*)"[^>]*value="([^"]*)"[^>]*(?:style="[^"]*"[^>]*)?edge="1"[^>]*source="([^"]*)"[^>]*target="([^"]*)"/g;

  // Also try alternate attribute order
  const edgeRegex2 =
    /<mxCell[^>]*id="([^"]*)"[^>]*value="([^"]*)"[^>]*edge="1"[^>]*parent="[^"]*"[^>]*source="([^"]*)"[^>]*target="([^"]*)"/g;

  while ((match = edgeRegex.exec(content)) !== null) {
    const [, id, label, source, target] = match;
    edges.push({ id, source, target, label });

    // Update adjacency lists
    if (outgoing.has(source)) {
      outgoing.get(source)!.push(target);
    }
    if (incoming.has(target)) {
      incoming.get(target)!.push(source);
    }
  }

  // Try alternate regex if no edges found
  if (edges.length === 0) {
    while ((match = edgeRegex2.exec(content)) !== null) {
      const [, id, label, source, target] = match;
      edges.push({ id, source, target, label });

      if (outgoing.has(source)) {
        outgoing.get(source)!.push(target);
      }
      if (incoming.has(target)) {
        incoming.get(target)!.push(source);
      }
    }
  }

  return { shapes, edges, outgoing, incoming };
}

/**
 * Update shape positions (and optionally dimensions) in the XML content.
 * When width/height are present in an entry they are written to the geometry
 * element as well, which lets layout algorithms enforce uniform row/column sizes.
 */
export function updateShapePositions(
  content: string,
  newPositions: Map<string, { x: number; y: number; width?: number; height?: number }>
): string {
  let updatedContent = content;

  for (const [id, pos] of newPositions) {
    // Update x and y
    const posRegex = new RegExp(
      `(<mxCell[^>]*id="${id}"[^>]*>[\\s\\S]*?<mxGeometry[^>]*)x="[^"]*"([^>]*)y="[^"]*"`,
      "g"
    );
    updatedContent = updatedContent.replace(
      posRegex,
      `$1x="${pos.x}"$2y="${pos.y}"`
    );

    // Update width and height when provided
    if (pos.width !== undefined) {
      const widthRegex = new RegExp(
        `(<mxCell[^>]*id="${id}"[^>]*>[\\s\\S]*?<mxGeometry[^>]*)width="[^"]*"`,
        "g"
      );
      updatedContent = updatedContent.replace(widthRegex, `$1width="${pos.width}"`);
    }

    if (pos.height !== undefined) {
      const heightRegex = new RegExp(
        `(<mxCell[^>]*id="${id}"[^>]*>[\\s\\S]*?<mxGeometry[^>]*)height="[^"]*"`,
        "g"
      );
      updatedContent = updatedContent.replace(heightRegex, `$1height="${pos.height}"`);
    }
  }

  return updatedContent;
}
