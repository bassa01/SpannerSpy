import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { buildDiagram } from "../lib/diagram-builder";
import {
  loadSchemaFromDdlPaths,
  loadSchemaFromDdlString,
  loadSchemaFromJsonString,
  loadSchemaFromJsonStrings,
  loadSchemaFromPaths,
} from "../lib/schema-loader";
import { sampleSchema } from "../sample/schema";
import { renderMermaid } from "../renderers/mermaid";
import type { DiagramModel, SpannerSchema } from "../types";

const TOOL_INPUT_SCHEMA = z.object({
  format: z.enum(["mermaid", "json"]).default("mermaid"),
  sample: z.boolean().optional(),
  schemaJson: z.string().optional(),
  schemaJsons: z.array(z.string()).optional(),
  schemaPaths: z.array(z.string()).optional(),
  ddl: z.string().optional(),
  ddlPaths: z.array(z.string()).optional(),
});

type ToolInput = z.infer<typeof TOOL_INPUT_SCHEMA>;

type ToolRegistration = (
  name: string,
  config: { title?: string; description?: string; inputSchema?: unknown },
  cb: (args: unknown) => Promise<{ content: { type: "text"; text: string }[] }>,
) => void;

const server = new McpServer({
  name: "spannerspy",
  version: Bun.env.npm_package_version ?? "0.0.0",
});

const registerTool = server.registerTool.bind(server) as ToolRegistration;

registerTool(
  "spannerspy.renderDiagram",
  {
    title: "Generate ER diagram",
    description: "Convert Cloud Spanner schemas (JSON or DDL) into Mermaid ER diagrams or JSON diagram models.",
    inputSchema: TOOL_INPUT_SCHEMA,
  },
  async (rawArgs: unknown) => {
    const parameters = TOOL_INPUT_SCHEMA.parse(rawArgs);
    validateSchemaSource(parameters);
    const schema = await resolveSchema(parameters);
    const diagram = buildDiagram(schema);
    const payload = formatDiagram(diagram, parameters.format);

    return {
      content: [
        {
          type: "text",
          text: payload,
        },
      ],
    };
  },
);

async function resolveSchema(parameters: ToolInput): Promise<SpannerSchema> {
  if (parameters.sample) {
    return sampleSchema;
  }

  if (parameters.schemaJsons && parameters.schemaJsons.length > 0) {
    return loadSchemaFromJsonStrings(parameters.schemaJsons);
  }

  if (parameters.schemaJson) {
    return loadSchemaFromJsonString(parameters.schemaJson);
  }

  if (parameters.schemaPaths && parameters.schemaPaths.length > 0) {
    return loadSchemaFromPaths(parameters.schemaPaths);
  }

  if (parameters.ddl) {
    return loadSchemaFromDdlString(parameters.ddl);
  }

  if (parameters.ddlPaths && parameters.ddlPaths.length > 0) {
    return loadSchemaFromDdlPaths(parameters.ddlPaths);
  }

  throw new Error("No schema source provided.");
}

function validateSchemaSource(parameters: ToolInput) {
  const sources = [
    parameters.sample ? "sample" : null,
    parameters.schemaJson ? "schemaJson" : null,
    parameters.schemaJsons && parameters.schemaJsons.length > 0 ? "schemaJsons" : null,
    parameters.schemaPaths && parameters.schemaPaths.length > 0 ? "schemaPaths" : null,
    parameters.ddl ? "ddl" : null,
    parameters.ddlPaths && parameters.ddlPaths.length > 0 ? "ddlPaths" : null,
  ].filter(Boolean);

  if (sources.length === 0) {
    throw new Error("Provide one schema source: sample, schemaJson, schemaJsons, schemaPaths, ddl, or ddlPaths.");
  }

  if (sources.length > 1) {
    throw new Error("Use exactly one schema source at a time.");
  }
}

function formatDiagram(model: DiagramModel, format: "mermaid" | "json"): string {
  if (format === "json") {
    return JSON.stringify(model, null, 2);
  }

  return renderMermaid(model);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
