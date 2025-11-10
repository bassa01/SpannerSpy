import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

import { loadSchemaFromDdl } from "../src/lib/schema-loader";
import { sampleSchema } from "../src/sample/schema";

const sampleDdlPath = fileURLToPath(new URL("../src/sample/schema.sql", import.meta.url));
const complexDdlPath = fileURLToPath(new URL("./fixtures/complex-schema.sql", import.meta.url));

describe("loadSchemaFromDdl", () => {
  it("parses Cloud Spanner DDL into the schema model", async () => {
    const schema = await loadSchemaFromDdl(sampleDdlPath);
    expect(schema.tables).toHaveLength(sampleSchema.tables.length);

    const singers = schema.tables.find((table) => table.name === "Singers");
    expect(singers).toBeTruthy();
    expect(singers?.primaryKey).toEqual(["SingerId"]);

    const albums = schema.tables.find((table) => table.name === "Albums");
    expect(albums?.interleavedIn).toBe("Singers");
    expect(schema.foreignKeys?.some((fk) => fk.name === "fk_albums_singers")).toBe(true);
  });

  it("preserves advanced types, arrays, and relationships", async () => {
    const schema = await loadSchemaFromDdl(complexDdlPath);
    expect(schema.tables).toHaveLength(3);

    const tenants = schema.tables.find((table) => table.name === "Tenants");
    expect(tenants?.primaryKey).toEqual(["TenantId"]);

    const allTypes = schema.tables.find((table) => table.name === "AllTypes");
    expect(allTypes?.interleavedIn).toBe("Tenants");
    expect(allTypes?.primaryKey).toEqual(["TenantId", "TypeId"]);

    const tenantIdColumn = allTypes?.columns.find((column) => column.name === "TenantId");
    expect(tenantIdColumn?.isNullable).toBe(false);

    const stringArray = allTypes?.columns.find((column) => column.name === "StringArray");
    expect(stringArray).toMatchObject({ type: "STRING(64)", isArray: true, isNullable: true });

    const bytesArray = allTypes?.columns.find((column) => column.name === "BytesArray");
    expect(bytesArray).toMatchObject({ type: "BYTES(16)", isArray: true });

    const orders = schema.tables.find((table) => table.name === "Orders");
    expect(orders?.interleavedIn).toBe("Tenants");
    expect(orders?.columns.find((column) => column.name === "RequestedAt")?.type).toBe("TIMESTAMP");

    const foreignKeyNames = (schema.foreignKeys ?? []).map((fk) => fk.name).sort();
    expect(foreignKeyNames).toEqual(["Orders_TenantId_TypeId_fk", "fk_alltypes_tenants"]);

    const compositeFk = schema.foreignKeys?.find((fk) => fk.name === "Orders_TenantId_TypeId_fk");
    expect(compositeFk?.referencingColumns).toEqual(["TenantId", "TypeId"]);
    expect(compositeFk?.referencedColumns).toEqual(["TenantId", "TypeId"]);
  });
});
