import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SpannerSchema } from "../types";
import { normalizeSchema } from "./normalize-schema";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = path.join(PROJECT_ROOT, "bin");
const BIN_NAME = process.platform === "win32" ? "spannerspy-ddl-parser.exe" : "spannerspy-ddl-parser";
const DEFAULT_BINARY = path.join(BIN_DIR, BIN_NAME);
const ENV_BINARY = Bun.env.SPANNERSPY_MEMEFISH_PARSER?.trim();
const DDL_EXTENSIONS = new Set([".sql", ".ddl"]);

let ddlBinaryPromise: Promise<string> | null = null;

export async function loadSchemaFromFile(path: string): Promise<SpannerSchema> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Schema file not found: ${path}`);
  }

  const payload = await file.json();
  return normalizeSchema(payload as SpannerSchema);
}

export async function loadSchemaFromDdl(sourcePath: string): Promise<SpannerSchema> {
  const resolvedPath = path.resolve(sourcePath);
  const stats = await safeStat(resolvedPath);
  if (!stats) {
    throw new Error(`DDL path not found: ${sourcePath}`);
  }

  const binary = await ensureDdlParserBinary();

  if (stats.isDirectory()) {
    const ddlFiles = await collectDdlFiles(resolvedPath);
    if (ddlFiles.length === 0) {
      throw new Error(`No *.sql or *.ddl files were found under ${sourcePath}`);
    }

    const combinedDdl = await combineDdlFiles(ddlFiles, resolvedPath);
    const { path: tempPath, cleanup } = await writeTempDdlFile(combinedDdl);
    try {
      const schema = await parseDdlFile(tempPath, binary);
      return normalizeSchema(schema);
    } finally {
      await cleanup();
    }
  }

  if (!stats.isFile()) {
    throw new Error(`DDL path must point to a file or directory: ${sourcePath}`);
  }

  const schema = await parseDdlFile(resolvedPath, binary);
  return normalizeSchema(schema);
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

async function collectDdlFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectDdlFiles(entryPath)));
    } else if (entry.isFile() && DDL_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

async function safeStat(target: string) {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}

async function parseDdlFile(sourcePath: string, binary: string): Promise<SpannerSchema> {
  const ddlFile = Bun.file(sourcePath);
  if (!(await ddlFile.exists())) {
    throw new Error(`DDL file not found: ${sourcePath}`);
  }

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
    return JSON.parse(stdout) as SpannerSchema;
  } catch (error) {
    throw new Error(`Memefish parser returned invalid JSON: ${(error as Error).message}`);
  }
}

async function combineDdlFiles(files: string[], root: string): Promise<string> {
  const createOnly: string[] = [];
  const mixedCreate: string[] = [];
  const neutral: string[] = [];
  const alterOnly: string[] = [];

  for (const file of files) {
    const relative = path.relative(root, file) || path.basename(file);
    const contents = await Bun.file(file).text();
    const normalized = contents.endsWith("\n") ? contents : `${contents}\n`;
    const chunk = `-- file: ${relative}\n${normalized}`;

    const hasCreate = /\bCREATE\s+TABLE\b/i.test(contents);
    const hasAlter = /\bALTER\s+TABLE\b/i.test(contents);

    if (hasCreate && !hasAlter) {
      createOnly.push(chunk);
    } else if (hasCreate && hasAlter) {
      mixedCreate.push(chunk);
    } else if (!hasCreate && hasAlter) {
      alterOnly.push(chunk);
    } else {
      neutral.push(chunk);
    }
  }

  return [...createOnly, ...mixedCreate, ...neutral, ...alterOnly].join("\n");
}

async function writeTempDdlFile(contents: string) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "spannerspy-"));
  const tmpFile = path.join(tmpDir, "combined.sql");
  await Bun.write(tmpFile, contents);

  return {
    path: tmpFile,
    cleanup: async () => {
      await rm(tmpDir, { recursive: true, force: true });
    },
  };
}
