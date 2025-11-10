export type SpannerScalarType =
  | "BOOL"
  | "INT64"
  | "FLOAT64"
  | "STRING"
  | "BYTES"
  | "DATE"
  | "TIMESTAMP"
  | "NUMERIC"
  | "JSON"
  | string;

export interface SpannerColumn {
  name: string;
  type: SpannerScalarType;
  isArray?: boolean;
  isNullable?: boolean;
  comment?: string;
}

export interface ForeignKey {
  name: string;
  referencingTable: string;
  referencingColumns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface SpannerTable {
  name: string;
  columns: SpannerColumn[];
  primaryKey: string[];
  interleavedIn?: string;
  comment?: string;
}

export interface SpannerSchema {
  tables: SpannerTable[];
  foreignKeys?: ForeignKey[];
}

export interface DiagramNode {
  id: string;
  label: string;
  fields: string[];
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramModel {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
