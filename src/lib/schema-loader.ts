import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SpannerSchema } from "../types";
import { normalizeSchema } from "./normalize-schema";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = path.join(PROJECT_ROOT, "bin");
const BIN_NAME = process.platform === "win32" ? "spannerspy-ddl-parser.exe" : "spannerspy-ddl-parser";
const DEFAULT_BINARY = path.join(BIN_DIR, BIN_NAME);
const ENV_BINARY = Bun.env.SPANNERSPY_MEMEFISH_PARSER?.trim();

let ddlBinaryPromise: Promise<string> | null = null;

export async function loadSchemaFromFile(path: string): Promise<SpannerSchema> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Schema file not found: ${path}`);
  }

  const payload = await file.json();
  return normalizeSchema(payload as SpannerSchema);
}

export async function loadSchemaFromPaths(inputs: string[]): Promise<SpannerSchema> {
  if (inputs.length === 0) {
    throw new Error("No schema input paths provided");
  }

  const visited = new Set<string>();
  const schemaFiles: string[] = [];

  for (const target of inputs) {
    const files = await expandInputPath(target);
    for (const filePath of files) {
      if (!visited.has(filePath)) {
        visited.add(filePath);
        schemaFiles.push(filePath);
      }
    }
  }

  if (schemaFiles.length === 0) {
    throw new Error("No schema files found within the provided paths");
  }

  const partialSchemas = await Promise.all(schemaFiles.map((filePath) => loadSchemaFromFile(filePath)));

  const tables = partialSchemas.flatMap((schema) => schema.tables);
  const foreignKeys = partialSchemas.flatMap((schema) => schema.foreignKeys ?? []);
  const indexes = partialSchemas.flatMap((schema) => schema.indexes ?? []);

  return normalizeSchema({
    tables,
    foreignKeys: foreignKeys.length ? foreignKeys : undefined,
    indexes: indexes.length ? indexes : undefined,
  });
}

export async function loadSchemaFromDdl(sourcePath: string): Promise<SpannerSchema> {
  const ddlFile = Bun.file(sourcePath);
  if (!(await ddlFile.exists())) {
    throw new Error(`DDL file not found: ${sourcePath}`);
  }

  const binary = await ensureDdlParserBinary();
  const process = Bun.spawn({
    cmd: [binary, "-input", sourcePath],
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to parse DDL with memefish (exit ${exitCode}): ${stderr.trim() || stdout}`);
  }

  try {
    const parsed = JSON.parse(stdout) as SpannerSchema;
    return normalizeSchema(parsed);
  } catch (error) {
    throw new Error(`Memefish parser returned invalid JSON: ${(error as Error).message}`);
  }
}

async function ensureDdlParserBinary(): Promise<string> {
  if (ENV_BINARY) {
    if (!(await fileExists(ENV_BINARY))) {
      throw new Error(`SPANNERSPY_MEMEFISH_PARSER points to ${ENV_BINARY}, but the file does not exist`);
    }
    return ENV_BINARY;
  }

  if (!ddlBinaryPromise) {
    ddlBinaryPromise = (async () => {
      if (await fileExists(DEFAULT_BINARY)) {
        return DEFAULT_BINARY;
      }

      await mkdir(BIN_DIR, { recursive: true });
      await buildDdlParserBinary(DEFAULT_BINARY);
      return DEFAULT_BINARY;
    })();
  }

  return ddlBinaryPromise;
}

async function buildDdlParserBinary(outputPath: string) {
  const goBinary = Bun.which("go");
  if (!goBinary) {
    throw new Error("The Go toolchain is required to parse DDL. Install Go 1.21+ or set SPANNERSPY_MEMEFISH_PARSER to an existing binary.");
  }

  const proc = Bun.spawn({
    cmd: [goBinary, "build", "-o", outputPath, "."],
    cwd: path.join(PROJECT_ROOT, "tools", "ddlparser"),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`go build failed while compiling the memefish parser: ${stderr.trim()}`);
  }
}

async function fileExists(target: string): Promise<boolean> {
  try {
    const file = Bun.file(target);
    return await file.exists();
  } catch {
    return false;
  }
}

async function expandInputPath(target: string): Promise<string[]> {
  let stats;
  try {
    stats = await stat(target);
  } catch {
    throw new Error(`Schema path not found: ${target}`);
  }

  if (stats.isFile()) {
    return [target];
  }

  if (!stats.isDirectory()) {
    throw new Error(`Unsupported schema path type: ${target}`);
  }

  const entries = await readdir(target, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await expandInputPath(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}
