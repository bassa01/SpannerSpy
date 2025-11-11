import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

import { buildDiagram } from "../src/lib/diagram-builder";
import { loadSchemaFromDdl } from "../src/lib/schema-loader";
import { renderMermaid } from "../src/renderers/mermaid";

const complexDdlPath = fileURLToPath(new URL("./fixtures/complex-schema.sql", import.meta.url));

describe("Cloud Spanner pipeline", () => {
  it("renders Mermaid diagrams for complex DDL", async () => {
    const schema = await loadSchemaFromDdl(complexDdlPath);
    const model = buildDiagram(schema);

    const allTypes = model.nodes.find((node) => node.id === "AllTypes");
    expect(allTypes?.fields).toContain("*TenantId: INT64!");
    expect(allTypes?.fields).toContain("*TypeId: INT64!");
    expect(allTypes?.fields).toContain("StringArray: STRING(64)[]?");

    const fkToTenants = model.edges.find((edge) => edge.label === "fk_alltypes_tenants");
    expect(fkToTenants).toEqual({ from: "AllTypes", to: "Tenants", label: "fk_alltypes_tenants" });

    const autoNamedFk = model.edges.find((edge) => edge.label === "Orders_TenantId_TypeId_fk");
    expect(autoNamedFk?.from).toBe("Orders");
    expect(autoNamedFk?.to).toBe("AllTypes");

    const interleaveEdges = model.edges.filter((edge) => edge.label === "INTERLEAVED IN");
    expect(interleaveEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "AllTypes", to: "Tenants" }),
        expect.objectContaining({ from: "Orders", to: "Tenants" }),
      ]),
    );

    const mermaid = renderMermaid(model);
    expect(mermaid).toContain("erDiagram");
    expect(mermaid).toContain("AllTypes }o--|| Tenants : INTERLEAVED IN");
    expect(mermaid).toContain("Orders }o--|| AllTypes : Orders_TenantId_TypeId_fk");
  });
});
