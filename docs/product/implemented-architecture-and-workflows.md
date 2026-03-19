# Implemented Architecture And Workflows

## Product Scope

The current product is an offline-first desktop BI application for non-technical users. The implemented scope already includes:

- local CSV import
- local Excel import
- direct local Parquet import
- local SQLite snapshot import
- preview and multi-source switching in the current session
- project save and reopen flows
- JSON project snapshot export
- CSV query-result export
- XLSX query-result export
- PDF query-result export
- semantic query execution
- basic chart rendering
- dashboard mode
- structured frontend and backend logging

## Implemented System Shape

### Frontend

- stack: React 19, TypeScript, Vite 7, Tailwind, shadcn-style primitives
- state: React Query for command-backed state, Zustand for lightweight UI state
- shared packages:
  - `packages/ui-kit`
  - `packages/chart-presets`

### Desktop backend

- entrypoint: `apps/desktop/src-tauri/src/lib.rs`
- runtime modules:
  - `commands`
  - `app_state`
  - `bootstrap`
  - `services`
  - `security`
- shared error contract: `AppError`

### Rust workspace crates

- `analytics-core`: semantic query execution and planning
- `connectors`: CSV, Excel, Parquet, and SQLite snapshot loading plus Parquet cache generation where needed
- `metadata-store`: SQLite metadata persistence
- `export-runtime`: JSON snapshot export plus CSV, XLSX, and PDF query-result export
- `job-runner`: tracked background jobs plus synchronous command timing wrappers
- `telemetry`: structured backend logging

## Main User Workflows

### Import and preview data

1. The user selects a CSV, Excel, Parquet, or SQLite file.
2. The desktop backend loads preview rows and schema information.
3. CSV, Excel, and SQLite imports materialize a Parquet cache artifact under the workspace cache path, while direct Parquet imports keep their original path.
4. The frontend displays the preview and data-source metadata.

### Run a query

1. The user configures dimensions, measures, filters, and limit.
2. The frontend submits a `SemanticQuery` through Tauri.
3. The backend executes the query through `analytics-core`.
4. The frontend renders the result table and chart view.

### Save and reopen a project

1. The user saves the current project state.
2. The backend persists project metadata through `metadata-store`, including data sources plus optional dashboard query/chart/layout state.
3. The user can later list saved projects and reopen one.
4. When saved dashboard state exists, the frontend restores the saved view mode, chart configuration, and reruns the saved semantic query.

### Export a project snapshot

1. The user chooses an export path.
2. The desktop backend serializes the current project snapshot through `export-runtime`.
3. The snapshot is written to JSON on local disk.

### Export a query result

1. The user runs a semantic query and gets a result set in the workbench.
2. The user chooses a CSV, XLSX, or PDF export action and picks an output path.
3. The frontend starts a tracked background export job through Tauri and polls its status.
4. The desktop backend serializes the current `QueryResult` through `export-runtime`.
5. The ordered result table is written to the selected local file format, or the export can be cancelled before completion.

## Current Constraints

- the product still focuses on local/offline execution only
- the current export capability covers JSON project snapshots and CSV, XLSX, and PDF query-result export
- Windows/MSVC desktop validation is slower than targeted crate validation because the desktop crate pulls the heavy analytics dependency path
