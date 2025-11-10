export type OutputFormat = "mermaid" | "json";

export interface CliOptions {
  input?: string;
  ddl?: string;
  output?: string;
  format: OutputFormat;
  sample: boolean;
}

const FORMAT_ALIASES: Record<string, OutputFormat> = {
  mermaid: "mermaid",
  mmd: "mermaid",
  json: "json",
};

export function parseArgs(argv: string[]): CliOptions {
  let input: string | undefined;
  let ddl: string | undefined;
  let output: string | undefined;
  let format: OutputFormat = "mermaid";
  let sample = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "-i":
      case "--input": {
        input = argv[i + 1];
        i += 1;
        break;
      }
      case "-d":
      case "--ddl": {
        ddl = argv[i + 1];
        i += 1;
        break;
      }
      case "-o":
      case "--output": {
        output = argv[i + 1];
        i += 1;
        break;
      }
      case "-f":
      case "--format": {
        const value = argv[i + 1];
        i += 1;
        const normalized = value?.toLowerCase();
        if (normalized && normalized in FORMAT_ALIASES) {
          format = FORMAT_ALIASES[normalized];
        } else {
          throw new Error(`Unsupported format: ${value}`);
        }
        break;
      }
      case "--sample": {
        sample = true;
        break;
      }
      case "-h":
      case "--help": {
        throw new HelpRequestedError();
      }
      default: {
        if (!token.startsWith("-")) {
          input = token;
        } else {
          throw new Error(`Unknown flag: ${token}`);
        }
      }
    }
  }

  if ((sample ? 1 : 0) + Number(Boolean(input)) + Number(Boolean(ddl)) > 1) {
    throw new Error("Use only one schema source: --sample, --input, or --ddl.");
  }

  return { input, ddl, output, format, sample };
}

export class HelpRequestedError extends Error {
  constructor() {
    super("Help requested");
  }
}
