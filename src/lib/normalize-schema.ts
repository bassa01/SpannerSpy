import type { SpannerSchema } from "../types";

export function normalizeSchema(schema: SpannerSchema): SpannerSchema {
  return {
    tables: schema.tables.map((table) => ({
      ...table,
      primaryKey: table.primaryKey ?? [],
      columns: table.columns.map((column) => ({
        isNullable: column.isNullable ?? true,
        isArray: column.isArray ?? false,
        ...column,
      })),
    })),
    foreignKeys: schema.foreignKeys?.map((fk) => ({
      ...fk,
      name: fk.name || `${fk.referencingTable}_${fk.referencedTable}`,
    })),
  } satisfies SpannerSchema;
}
