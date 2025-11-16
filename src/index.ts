import { buildDiagram } from "./lib/diagram-builder";
import { HelpRequestedError, parseArgs } from "./lib/parse-args";
import { loadSchemaFromDdlPaths, loadSchemaFromPaths } from "./lib/schema-loader";
import { renderMermaid } from "./renderers/mermaid";
import { sampleSchema } from "./sample/schema";
import type { CliOptions } from "./lib/parse-args";
import type { DiagramModel, SpannerSchema } from "./types";

async function main() {
  try {
    const options = parseArgs(Bun.argv.slice(2));
    const schema = await resolveSchema(options);
    const diagram = buildDiagram(schema);
    const output = formatDiagram(diagram, options.format);

    if (options.output) {
      await Bun.write(options.output, output);
      console.log(`Diagram written to ${options.output}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    handleError(error);
  }
}

async function resolveSchema(options: CliOptions): Promise<SpannerSchema> {
  const hasInputs = options.inputPaths.length > 0;
  const hasDdl = options.ddlPaths.length > 0;
  const sourcesChosen = (options.sample ? 1 : 0) + Number(hasInputs) + Number(hasDdl);

  if (sourcesChosen === 0) {
    throw new Error("No schema input provided. Use --sample, --input path/to/schema.json, or --ddl path/or/directory.");
  }

  if (options.sample) {
    return sampleSchema;
  }

  if (hasDdl) {
    return loadSchemaFromDdlPaths(options.ddlPaths);
  }

  if (hasInputs) {
    return loadSchemaFromPaths(options.inputPaths);
  }

  throw new Error("Unable to resolve schema source.");
}

function formatDiagram(model: DiagramModel, format: "mermaid" | "json"): string {
  if (format === "json") {
    return JSON.stringify(model, null, 2);
  }

  return renderMermaid(model);
}

function handleError(error: unknown) {
  if (error instanceof HelpRequestedError) {
    printHelp();
    return;
  }

  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function printHelp() {
  console.log(`SpannerSpy — generate ER diagrams from Cloud Spanner schemas\n\n`);
  console.log("Usage: bun start -- [options]\n");
  console.log("Options:");
  console.log("  -i, --input <path>    JSON schema file or directory containing schema files (repeatable)");
  console.log("  -d, --ddl <path>      Cloud Spanner DDL file or directory (repeatable)");
  console.log("      --sample          Use the built-in sample schema");
  console.log("  -f, --format <fmt>    Output format: mermaid (default) or json");
  console.log("  -o, --output <path>   Write diagram to disk instead of stdout");
  console.log("  -h, --help            Show this message\n");
}

await main();
