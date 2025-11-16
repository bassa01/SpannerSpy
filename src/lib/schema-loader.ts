import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
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

  const schemaFiles = await collectFilesFromTargets(inputs, {
    description: "schema",
    extensions: [".json"],
    allowFilesWithAnyExtension: true,
  });

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

export async function loadSchemaFromDdlPaths(inputs: string[]): Promise<SpannerSchema> {
  if (inputs.length === 0) {
    throw new Error("No DDL paths provided");
  }

  const ddlFiles = await collectFilesFromTargets(inputs, {
    description: "DDL",
    extensions: [".sql"],
    allowFilesWithAnyExtension: true,
  });

  if (ddlFiles.length === 0) {
    throw new Error("No DDL files found within the provided paths");
  }

  if (ddlFiles.length === 1) {
    return loadSchemaFromDdl(ddlFiles[0]!);
  }

  const combinedScript = await buildOrderedDdlScript(ddlFiles);
  return loadSchemaFromCombinedDdl(combinedScript);
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

interface FileCollectionOptions {
  description: string;
  extensions: string[];
  allowFilesWithAnyExtension?: boolean;
}

async function collectFilesFromTargets(targets: string[], options: FileCollectionOptions): Promise<string[]> {
  const seen = new Set<string>();
  const files: string[] = [];

  for (const target of targets) {
    const expanded = await expandTarget(target, options);
    for (const filePath of expanded) {
      if (!seen.has(filePath)) {
        seen.add(filePath);
        files.push(filePath);
      }
    }
  }

  return files;
}

async function expandTarget(target: string, options: FileCollectionOptions): Promise<string[]> {
  let stats;
  try {
    stats = await stat(target);
  } catch {
    throw new Error(`${options.description} path not found: ${target}`);
  }

  if (stats.isFile()) {
    if (!options.allowFilesWithAnyExtension && !hasAllowedExtension(target, options.extensions)) {
      throw new Error(`${options.description} path must end with ${options.extensions.join(", ")}: ${target}`);
    }
    return [target];
  }

  if (!stats.isDirectory()) {
    throw new Error(`Unsupported ${options.description} path type: ${target}`);
  }

  const collected: string[] = [];
  await collectFilesFromDirectory(target, options, collected);
  collected.sort();
  return collected;
}

async function collectFilesFromDirectory(directory: string, options: FileCollectionOptions, acc: string[]) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    let isDir = entry.isDirectory();
    let isFile = entry.isFile();

    if (entry.isSymbolicLink()) {
      let stats: Awaited<ReturnType<typeof stat>>;
      try {
        stats = await stat(entryPath);
      } catch {
        continue;
      }
      isDir = stats.isDirectory();
      isFile = stats.isFile();
    }

    if (isDir) {
      await collectFilesFromDirectory(entryPath, options, acc);
      continue;
    }

    if (isFile && hasAllowedExtension(entryPath, options.extensions)) {
      acc.push(entryPath);
    }
  }
}

function hasAllowedExtension(filePath: string, extensions: string[]): boolean {
  if (extensions.length === 0) {
    return true;
  }
  const lower = filePath.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

async function loadSchemaFromCombinedDdl(sql: string): Promise<SpannerSchema> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "spannerspy-ddl-"));
  const tempFile = path.join(tempDir, "combined.sql");
  try {
    await Bun.write(tempFile, sql);
    return await loadSchemaFromDdl(tempFile);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

type StatementKind = "createTable" | "alterTable" | "createIndex" | "other";

const STATEMENT_PRIORITY: Record<StatementKind, number> = {
  createTable: 0,
  other: 1,
  alterTable: 2,
  createIndex: 3,
};

interface SqlStatement {
  text: string;
  kind: StatementKind;
  order: number;
}

async function buildOrderedDdlScript(filePaths: string[]): Promise<string> {
  const statements: SqlStatement[] = [];
  let order = 0;

  for (const filePath of filePaths) {
    const content = await Bun.file(filePath).text();
    const pieces = splitSqlStatements(content);
    for (const piece of pieces) {
      const trimmed = piece.trim();
      if (!trimmed) {
        continue;
      }
      statements.push({
        text: ensureStatementTerminated(trimmed),
        kind: classifyStatement(trimmed),
        order: order,
      });
      order += 1;
    }
  }

  statements.sort((a, b) => {
    const priorityDiff = STATEMENT_PRIORITY[a.kind] - STATEMENT_PRIORITY[b.kind];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.order - b.order;
  });

  if (statements.length === 0) {
    throw new Error("No DDL statements found within the provided files");
  }

  return `${statements.map((stmt) => stmt.text).join("\n\n")}\n`;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let buffer = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i]!;
    const next = sql[i + 1];

    if (inLineComment) {
      buffer += char;
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && char === "-" && next === "-") {
      buffer += char + next;
      i += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingle && !inDouble && char === "/" && next === "*") {
      buffer += char + next;
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (!inDouble && char === "'") {
      buffer += char;
      if (inSingle) {
        if (next === "'") {
          buffer += next;
          i += 1;
        } else {
          inSingle = false;
        }
      } else {
        inSingle = true;
      }
      continue;
    }

    if (!inSingle && char === '"') {
      buffer += char;
      if (inDouble) {
        if (next === '"') {
          buffer += next;
          i += 1;
        } else {
          inDouble = false;
        }
      } else {
        inDouble = true;
      }
      continue;
    }

    if (!inSingle && !inDouble && char === ";") {
      buffer += char;
      statements.push(buffer);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (buffer.trim()) {
    statements.push(buffer);
  }

  return statements;
}

function classifyStatement(statement: string): StatementKind {
  const head = stripLeadingDecorators(statement).toUpperCase();
  if (/^CREATE\s+TABLE\b/.test(head)) {
    return "createTable";
  }
  if (/^ALTER\s+TABLE\b/.test(head)) {
    return "alterTable";
  }
  if (/^CREATE\s+(?:UNIQUE\s+)?(?:NULL\s+FILTERED\s+)?INDEX\b/.test(head)) {
    return "createIndex";
  }
  return "other";
}

function stripLeadingDecorators(sql: string): string {
  let i = 0;
  while (i < sql.length) {
    const char = sql[i]!;
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (sql.startsWith("--", i)) {
      const nextLine = sql.indexOf("\n", i + 2);
      if (nextLine === -1) {
        return "";
      }
      i = nextLine + 1;
      continue;
    }
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) {
        return "";
      }
      i = end + 2;
      continue;
    }
    break;
  }
  return sql.slice(i);
}

function ensureStatementTerminated(statement: string): string {
  return statement.endsWith(";") ? statement : `${statement};`;
}
