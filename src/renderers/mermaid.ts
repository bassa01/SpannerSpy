import type { DiagramModel } from "../types";

export function renderMermaid(model: DiagramModel): string {
  const lines = ["erDiagram"];

  for (const node of model.nodes) {
    lines.push(`  ${formatId(node.id)} {`);
    for (const field of node.fields) {
      lines.push(`    ${field}`);
    }
    lines.push("  }");
  }

  for (const edge of model.edges) {
    const label = edge.label ? ` : ${edge.label}` : "";
    lines.push(`  ${formatId(edge.from)} }o--|| ${formatId(edge.to)}${label}`);
  }

  return lines.join("\n");
}

function formatId(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}
