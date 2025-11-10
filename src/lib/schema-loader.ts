import { SpannerSchema } from "../types";

export async function loadSchemaFromFile(path: string): Promise<SpannerSchema> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Schema file not found: ${path}`);
  }

  const payload = await file.json();
  return normalizeSchema(payload as SpannerSchema);
}

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
