import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

import { loadSchemaFromDdl } from "../src/lib/schema-loader";
import { sampleSchema } from "../src/sample/schema";

const sampleDdlPath = fileURLToPath(new URL("../src/sample/schema.sql", import.meta.url));

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
});
