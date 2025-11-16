# SpannerSpy

Generate lightweight ER diagrams from Cloud Spanner schemas using TypeScript + Bun.

## Prerequisites
- [Bun](https://bun.sh) v1.2+ (provides the runtime, package manager, and test runner)
- [Go](https://go.dev/dl/) 1.21+ (only required when parsing Cloud Spanner DDL; used to compile the bundled [memefish](https://github.com/cloudspannerecosystem/memefish) helper)

## Install
```
bun install
```

## Usage
- Print the built-in example diagram:
  ```
  bun start -- --sample
  ```
- Convert a schema JSON file (see the format below) into Mermaid ER syntax:
  ```
  bun start -- --input ./schema.json > diagram.mmd
  ```
- Point to one or more directories and aggregate every `.json` schema file inside:
  ```
  bun start -- ./schemas/service-a ./schemas/service-b
  ```
  You can repeat `--input <path>` or provide bare positional paths; each path may be a file or directory and nested directories are scanned recursively.
- Parse raw Cloud Spanner DDL (SQL) using memefish and emit Mermaid:
  ```
  bun start -- --ddl ./schema.sql
  ```
  Repeat `--ddl <path>` or pass directories to stitch multiple files; statements are automatically ordered so CREATE TABLE definitions are parsed before ALTER TABLE or CREATE INDEX commands that depend on them.
- Emit the intermediate diagram model instead of Mermaid:
  ```
  bun start -- --input ./schema.json --format json
  ```
- Continuously rebuild while editing TypeScript sources:
  ```
  bun run --watch src/index.ts -- --sample
  ```

Run the test suite with `bun test` and type-check with `bun run typecheck`.

## Standalone Binaries
Bun can compile the CLI and the MCP server into single-file executables that do not require a Bun runtime on the target machine.

- `bun run build:cli` — emits `dist/spannerspy` (or `dist/spannerspy.exe` on Windows). This binary exposes the same CLI flags as `bun start`.
- `bun run build:mcp` — emits `dist/spannerspy-mcp`, a stdio-based MCP server binary.
- `bun run build:all` — convenience command that produces both binaries.

The repository’s `bin` entries point at `dist/` so you can `npm pack`/`npm publish` after running `bun run build:all`. Keep the compiled files out of source control (`dist/` is already gitignored).

## MCP Server (Cursor, Claude, etc.)
The MCP endpoint exposes a single tool named `spannerspy.renderDiagram`. It accepts the same schema sources as the CLI and returns either Mermaid text or the serialized diagram model depending on `format`.

### Run locally
- Development: `bun run mcp`
- Binary: `bun run build:mcp && ./dist/spannerspy-mcp`

The server listens on stdio, so avoid writing to stdout (logs go to stderr).

### Register with Cursor
1. Enable MCP under `Cursor Settings → Experimental → MCP` once.  
2. Create or update `~/.cursor/mcp.json` (`%USERPROFILE%\.cursor\mcp.json` on Windows) with an entry for SpannerSpy, then restart Cursor to reload.

```json
{
  "mcpServers": {
    "spannerspy": {
      "command": "/absolute/path/to/dist/spannerspy-mcp",
      "args": [],
      "env": {
        "SPANNERSPY_MEMEFISH_PARSER": "/optional/custom/parser"
      }
    }
  }
}
```

Cursor exposes MCP tools from the chat composer (`Cmd/Ctrl+L`). Select `spannerspy.renderDiagram`, provide arguments (examples below), and the response will contain the rendered Mermaid text you can copy into a Markdown block or preview directly in Cursor.

### Tool arguments
| Field | Notes |
| --- | --- |
| `format` | `"mermaid"` (default) or `"json"` for the raw diagram model. |
| `sample` | `true` to render the built-in sample schema without any files. |
| `schemaPaths` | Array of file or directory paths containing JSON schemas (same as `--input`). |
| `schemaJson` / `schemaJsons` | Inline JSON payload(s) when the schema is not on disk. |
| `ddlPaths` | Array of `.sql` files or directories; the server will order statements automatically. |
| `ddl` | Raw Cloud Spanner DDL string (identical to piping a temp file through `--ddl`). |

Provide exactly one schema source per call.

#### Example payloads

Generate Mermaid from JSON files on disk:
```json
{
  "format": "mermaid",
  "schemaPaths": ["./schemas/billing", "./schemas/warehouse"]
}
```

Render JSON diagram output from a pasted DDL snippet:
```json
{
  "format": "json",
  "ddl": "CREATE TABLE Singers (...);"
}
```

## Web Studio UI

Explore the schema as an interactive ER experience that mirrors SchemaSpy while adopting a clean, high-contrast Apple-inspired aesthetic.

- Start the Vite-powered UI dev server: `bun run web:dev`
- Type-check the UI: `bun run web:typecheck`
- Create a production build: `bun run web:build` (outputs `web/dist`)
- Preview the production build locally: `bun run web:preview`

The studio lets you:

1. Load the built-in sample schema or drop/paste any JSON exported from Cloud Spanner.
2. Pan/zoom a glassmorphic React Flow canvas with automatic dagre layout, FK + interleaving edge legends, and Apple-like lighting.
3. Inspect any table via the slide-in drawer to review columns, primary keys, and interleaving metadata.

### About `--ddl`
When you pass `--ddl path/to/schema.sql`, SpannerSpy shells out to a tiny Go binary located in `tools/ddlparser`. That binary embeds the official memefish query parser and converts the AST into the JSON schema format that the rest of the TypeScript pipeline already understands. The first run will automatically run `go build` and drop the compiled helper in `bin/spannerspy-ddl-parser`. Set `SPANNERSPY_MEMEFISH_PARSER=/absolute/path/to/parser` if you want to reuse a custom build or distribute a precompiled binary.

## Schema Format
The CLI expects a JSON payload shaped like this:
```json
{
  "tables": [
    {
      "name": "Albums",
      "primaryKey": ["SingerId", "AlbumId"],
      "columns": [
        { "name": "SingerId", "type": "INT64", "isNullable": false },
        { "name": "AlbumId", "type": "INT64", "isNullable": false },
        { "name": "AlbumTitle", "type": "STRING" }
      ],
      "interleavedIn": "Singers"
    }
  ],
  "foreignKeys": [
    {
      "name": "fk_albums_singers",
      "referencingTable": "Albums",
      "referencingColumns": ["SingerId"],
      "referencedTable": "Singers",
      "referencedColumns": ["SingerId"]
    }
  ]
}
```
This mirrors the information you can fetch from `INFORMATION_SCHEMA` when querying Cloud Spanner. Future work can add direct querying + transformation, but the current setup keeps things minimal while providing a clear extension point via TypeScript modules in `src/`.

## Project Structure
- `src/index.ts` — CLI entry point.
- `src/lib` — schema normalization + diagram builder helpers.
- `src/renderers` — format-specific output (currently Mermaid ER diagrams).
- `src/sample/schema.ts` — self-contained sample schema for demos/tests.
- `src/sample/schema.sql` — Cloud Spanner DDL equivalent of the sample schema.
- `tools/ddlparser` — Go command that wraps memefish and emits the JSON schema SpannerSpy consumes.
- `tests` — Bun test files.

## Next Steps
1. Connect to Cloud Spanner (REST or gcloud CLI) to auto-export schemas.
2. Expand renderers (e.g., PlantUML, Graphviz) by following the `DiagramModel` abstraction.
3. Enrich metadata (indexes, interleaving depth, on-delete semantics) before diagramming.
