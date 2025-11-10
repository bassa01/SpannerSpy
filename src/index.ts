import { buildDiagram } from "./lib/diagram-builder";
import { HelpRequestedError, parseArgs } from "./lib/parse-args";
import { loadSchemaFromFile } from "./lib/schema-loader";
import { renderMermaid } from "./renderers/mermaid";
import { sampleSchema } from "./sample/schema";
import { DiagramModel, SpannerSchema } from "./types";

async function main() {
  try {
    const options = parseArgs(Bun.argv.slice(2));
    const schema = await resolveSchema(options.sample, options.input);
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

async function resolveSchema(useSample: boolean, input?: string): Promise<SpannerSchema> {
  if (useSample) {
    return sampleSchema;
  }

  if (!input) {
    throw new Error("No schema input provided. Pass --input path/to/schema.json or use --sample.");
  }

  return loadSchemaFromFile(input);
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
  console.log("  -i, --input <path>    Path to a JSON schema exported from Cloud Spanner");
  console.log("      --sample          Use the built-in sample schema");
  console.log("  -f, --format <fmt>    Output format: mermaid (default) or json");
  console.log("  -o, --output <path>   Write diagram to disk instead of stdout");
  console.log("  -h, --help            Show this message\n");
}

await main();
