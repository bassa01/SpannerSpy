import dagre from "dagre";
import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";

import { normalizeSchema } from "@shared/lib/normalize-schema";
import type { SpannerSchema } from "@shared/types";

const NODE_WIDTH = 300;
const NODE_BASE_HEIGHT = 140;
const NODE_ROW_HEIGHT = 26;

export type RelationshipKind = "foreignKey" | "interleaved";

export interface VisualColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isArray: boolean;
  comment?: string;
}

export interface VisualTable {
  name: string;
  columns: VisualColumn[];
  interleavedIn?: string;
  comment?: string;
}

export interface VisualRelationship {
  id: string;
  kind: RelationshipKind;
  from: string;
  to: string;
  label: string;
  description: string;
}

export interface DiagramStats {
  tables: number;
  columns: number;
  relationships: number;
  interleaves: number;
}

export interface VisualDiagram {
  tables: VisualTable[];
  relationships: VisualRelationship[];
  stats: DiagramStats;
}

export type TableNodeData = Record<string, unknown> & {
  table: VisualTable;
};

export type RelationshipEdgeData = Record<string, unknown> & {
  kind: RelationshipKind;
  description: string;
  label: string;
};

export interface FlowGraph {
  nodes: Node<TableNodeData>[];
  edges: Edge<RelationshipEdgeData>[];
}

export function buildVisualDiagram(schema: SpannerSchema): VisualDiagram {
  const normalized = normalizeSchema(schema);
  const tables: VisualTable[] = normalized.tables.map((table): VisualTable => ({
    name: table.name,
    columns: table.columns.map((column): VisualColumn => ({
      name: column.name,
      type: column.isArray ? `${column.type}[]` : column.type,
      isPrimaryKey: table.primaryKey.includes(column.name),
      isNullable: column.isNullable ?? true,
      isArray: column.isArray ?? false,
      comment: column.comment,
    })),
    interleavedIn: table.interleavedIn,
    comment: table.comment,
  }));

  const tableNames = new Set(tables.map((t) => t.name));

  const fkRelationships: VisualRelationship[] = (normalized.foreignKeys ?? [])
    .filter((fk) => tableNames.has(fk.referencingTable) && tableNames.has(fk.referencedTable))
    .map((fk): VisualRelationship => ({
      id: fk.name,
      kind: "foreignKey" as const,
      from: fk.referencingTable,
      to: fk.referencedTable,
      label: fk.name,
      description: `${fk.referencingColumns.join(", ")} → ${fk.referencedColumns.join(", ")}`,
    }));

  const interleavedRelationships: VisualRelationship[] = tables
    .filter((table) => table.interleavedIn && tableNames.has(table.interleavedIn))
    .map((table): VisualRelationship => ({
      id: `${table.name}_interleaved_${table.interleavedIn}`,
      kind: "interleaved" as const,
      from: table.name,
      to: table.interleavedIn!,
      label: "INTERLEAVED IN",
      description: `${table.name} rows co-locate with ${table.interleavedIn}`,
    }));

  const relationships = [...fkRelationships, ...interleavedRelationships];

  const stats: DiagramStats = {
    tables: tables.length,
    columns: tables.reduce((acc, table) => acc + table.columns.length, 0),
    relationships: relationships.length,
    interleaves: interleavedRelationships.length,
  };

  return { tables, relationships, stats };
}

export function createFlowGraph(diagram: VisualDiagram): FlowGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    nodesep: 80,
    ranksep: 120,
    marginx: 80,
    marginy: 80,
  });

  for (const table of diagram.tables) {
    const height = NODE_BASE_HEIGHT + table.columns.length * NODE_ROW_HEIGHT;
    g.setNode(table.name, { width: NODE_WIDTH, height });
  }

  for (const rel of diagram.relationships) {
    g.setEdge(rel.from, rel.to);
  }

  dagre.layout(g);

  const nodes: Node<TableNodeData>[] = diagram.tables.map((table): Node<TableNodeData> => {
    const metadata = g.node(table.name) as (dagre.Node & { width: number; height: number }) | undefined;
    const width = metadata?.width ?? NODE_WIDTH;
    const height = metadata?.height ?? NODE_BASE_HEIGHT + table.columns.length * NODE_ROW_HEIGHT;
    const centerX = metadata?.x ?? 0;
    const centerY = metadata?.y ?? 0;
    return {
      id: table.name,
      type: "tableNode",
      position: { x: centerX - width / 2, y: centerY - height / 2 },
      data: { table },
      draggable: true,
      selectable: true,
      style: { width },
    };
  });

  const edges: Edge<RelationshipEdgeData>[] = diagram.relationships.map((rel): Edge<RelationshipEdgeData> => {
    const color = rel.kind === "foreignKey" ? "#38bdf8" : "#34d399";
    return {
      id: rel.id,
      source: rel.from,
      target: rel.to,
      type: "smoothstep",
      animated: rel.kind === "foreignKey",
      label: rel.kind === "foreignKey" ? `FK · ${rel.label}` : rel.label,
      data: {
        kind: rel.kind,
        description: rel.description,
        label: rel.label,
      },
      style: { stroke: color, strokeWidth: 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      labelStyle: {
        fill: color,
        fontWeight: 600,
        fontSize: 12,
        textTransform: "uppercase",
      },
    };
  });

  return { nodes, edges };
}
