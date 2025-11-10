import { describe, expect, it } from "bun:test";
import { buildDiagram } from "../src/lib/diagram-builder";
import { sampleSchema } from "../src/sample/schema";

describe("buildDiagram", () => {
  it("creates nodes and edges for the sample schema", () => {
    const model = buildDiagram(sampleSchema);
    expect(model.nodes).toHaveLength(2);
    expect(model.edges.length).toBeGreaterThan(0);
    expect(model.nodes[0].fields.some((field) => field.startsWith("*"))).toBe(true);
  });
});
