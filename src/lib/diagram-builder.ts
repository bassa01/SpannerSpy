import type { DiagramModel, DiagramNode, DiagramEdge, SpannerSchema } from "../types";

export function buildDiagram(schema: SpannerSchema): DiagramModel {
  const nodes: DiagramNode[] = schema.tables.map((table) => ({
    id: table.name,
    label: table.name,
    fields: table.columns.map((column) => formatColumn(column.name, {
      isPrimaryKey: table.primaryKey.includes(column.name),
      type: column.type,
      nullable: column.isNullable !== false,
      isArray: column.isArray === true,
    })),
  }));

  const edges: DiagramEdge[] = [];

  for (const fk of schema.foreignKeys ?? []) {
    edges.push({
      from: fk.referencingTable,
      to: fk.referencedTable,
      label: fk.name,
    });
  }

  for (const table of schema.tables) {
    if (table.interleavedIn) {
      edges.push({
        from: table.name,
        to: table.interleavedIn,
        label: "INTERLEAVED IN",
      });
    }
  }

  return { nodes, edges };
}

interface ColumnFormatOptions {
  isPrimaryKey: boolean;
  type: string;
  nullable: boolean;
  isArray: boolean;
}

function formatColumn(name: string, options: ColumnFormatOptions): string {
  const typeSuffix = options.isArray ? `${options.type}[]` : options.type;
  const nullableSuffix = options.nullable ? "?" : "!";
  const pkPrefix = options.isPrimaryKey ? "*" : "";
  return `${pkPrefix}${name}: ${typeSuffix}${nullableSuffix}`;
}
