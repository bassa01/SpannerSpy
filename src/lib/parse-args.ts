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
    if (!token) {
      continue;
    }
    switch (token) {
      case "-i":
      case "--input": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error(`Missing value for ${token}`);
        }
        input = value;
        i += 1;
        break;
      }
      case "-d":
      case "--ddl": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error(`Missing value for ${token}`);
        }
        ddl = value;
        i += 1;
        break;
      }
      case "-o":
      case "--output": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error(`Missing value for ${token}`);
        }
        output = value;
        i += 1;
        break;
      }
      case "-f":
      case "--format": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --format");
        }
        i += 1;
        const normalized = value?.toLowerCase();
        if (normalized && normalized in FORMAT_ALIASES) {
          const nextFormat = FORMAT_ALIASES[normalized as keyof typeof FORMAT_ALIASES]!;
          format = nextFormat;
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
