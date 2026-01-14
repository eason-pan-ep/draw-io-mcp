export interface Shape {
  id: string;
  value: string;
  style: string;
  vertex: string;
  parent: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Edge {
  id: string;
  value: string;
  style: string;
  edge: string;
  parent: string;
  source: string;
  target: string;
}

export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

export type ShapeType =
  | "rectangle"
  | "ellipse"
  | "rhombus"
  | "cylinder"
  | "hexagon"
  | "cloud"
  | "step"
  | "parallelogram"
  | "trapezoid"
  | "triangle";

export type ConnectorStyle = "straight" | "curved" | "orthogonal";
