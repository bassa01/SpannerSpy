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
- Parse raw Cloud Spanner DDL (SQL) using memefish and emit Mermaid:
  ```
  bun start -- --ddl ./schema.sql
  ```
  The `--ddl` flag also accepts a directory, in which case every `.sql`/`.ddl` file under that tree is merged into a single schema before rendering.
- Emit the intermediate diagram model instead of Mermaid:
  ```
  bun start -- --input ./schema.json --format json
  ```
- Continuously rebuild while editing TypeScript sources:
  ```
  bun run --watch src/index.ts -- --sample
  ```

Run the test suite with `bun test` and type-check with `bun run typecheck`.

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
When you pass `--ddl path/to/schema.sql`, SpannerSpy shells out to a tiny Go binary located in `tools/ddlparser`. You can also point `--ddl` at a directory to recursively merge every `.sql`/`.ddl` file into a single ER diagram—handy when each table lives in its own file. That binary embeds the official memefish query parser and converts the AST into the JSON schema format that the rest of the TypeScript pipeline already understands. The first run will automatically run `go build` and drop the compiled helper in `bin/spannerspy-ddl-parser`. Set `SPANNERSPY_MEMEFISH_PARSER=/absolute/path/to/parser` if you want to reuse a custom build or distribute a precompiled binary.

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
