import type { ShapeType, ConnectorStyle } from "../types.js";

/**
 * Generates Draw.io style strings for different shape types.
 */
export function getShapeStyle(
  shapeType: ShapeType,
  fillColor = "#dae8fc",
  strokeColor = "#6c8ebf"
): string {
  const baseStyles: Record<ShapeType, string> = {
    rectangle: "rounded=0",
    ellipse: "ellipse",
    rhombus: "rhombus",
    cylinder: "shape=cylinder3",
    hexagon: "shape=hexagon",
    cloud: "ellipse;shape=cloud",
    step: "shape=step",
    parallelogram: "shape=parallelogram",
    trapezoid: "shape=trapezoid",
    triangle: "triangle",
  };

  const baseStyle = baseStyles[shapeType] || "rounded=0";
  return `${baseStyle};whiteSpace=wrap;html=1;fillColor=${fillColor};strokeColor=${strokeColor};fontSize=12;align=left;verticalAlign=top;spacingLeft=8;spacingRight=8;spacingTop=6;spacingBottom=6;`;
}

/**
 * Generates Draw.io style strings for connector lines.
 */
export function getConnectorStyle(style: ConnectorStyle = "orthogonal"): string {
  const styles: Record<ConnectorStyle, string> = {
    straight: "edgeStyle=none",
    curved: "edgeStyle=none;curved=1",
    orthogonal: "edgeStyle=orthogonalEdgeStyle",
  };

  const edgeStyle = styles[style] || styles.orthogonal;
  return `${edgeStyle};rounded=0;orthogonalLoop=1;jettySize=auto;html=1;`;
}
