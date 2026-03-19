# Desktop Tauri Commands

This document describes the current frontend-facing desktop command surface implemented in `apps/desktop/src-tauri/src/commands/mod.rs`.

## Command Ownership

- Module: `apps/desktop/src-tauri/src/commands`
- Error contract: `apps/desktop/src-tauri/src/error.rs`
- Bootstrap registration: `apps/desktop/src-tauri/src/bootstrap/mod.rs`

## Commands

### `greet(name: string) -> string`

- Purpose: smoke-test/sample command generated from the base Tauri template
- Current role: non-critical helper command

### `load_data_source(path: string) -> LoadedDataSource`

- Purpose: load a CSV, Excel, Parquet, or SQLite data source and materialize a workspace Parquet cache artifact when the source requires one
- Backend flow:
  - logs command start
  - builds a workspace cache path through `security::build_cache_path`
  - loads the source through `connectors::DataSourceLoader::load_with_cache`
  - preserves direct `.parquet` inputs on their original path instead of generating a second cache file
  - snapshots SQLite imports from the first user table into the workspace Parquet cache path
  - logs success or structured failure
- Main error cases:
  - source file missing
  - unsupported file type
  - workbook missing a readable worksheet or header row
  - parse failure
  - cache write failure

### `execute_query(query: SemanticQuery) -> QueryResult`

- Purpose: execute a semantic query against the current data source path or cache path
- Backend flow:
  - logs command start
  - executes the query through `analytics_core::QueryEngine`
  - returns structured query results or a structured `AppError`

### `save_project_metadata(metadata: ProjectMetadata) -> ()`

- Purpose: persist project metadata into the SQLite metadata store
- Backend flow:
  - uses managed `MetadataStoreState`
  - stores project basics, data-source metadata, and optional dashboard state
  - calls `MetadataStore::save_project`
  - logs success or structured failure

### `load_project_metadata(project_id: string) -> ProjectMetadata | null`

- Purpose: load one saved project plus its persisted data-source and dashboard metadata
- Backend flow:
  - uses managed `MetadataStoreState`
  - calls `MetadataStore::load_project`
  - returns `null` if the project id is not found

### `list_saved_projects() -> ProjectSummary[]`

- Purpose: return saved project summaries for project selection and reopening flows
- Backend flow:
  - uses managed `MetadataStoreState`
  - calls `MetadataStore::list_projects`

### `export_project_snapshot(export_path, exported_at, project, loaded_data_sources) -> ()`

- Purpose: export the current project snapshot to JSON
- Backend flow:
  - rejects empty export paths before dispatch
  - writes the snapshot through `export_runtime::export_project_snapshot`
  - logs success or structured failure

### `export_query_result(export_path, query_name, result) -> ()`

- Purpose: export the current query result table to CSV
- Backend flow:
  - rejects empty export paths before dispatch
  - writes ordered result columns and rows through `export_runtime::export_query_result_csv`
  - logs success or structured failure

### `export_query_result_xlsx_command(export_path, query_name, result) -> ()`

- Purpose: export the current query result table to an XLSX workbook
- Backend flow:
  - rejects empty export paths before dispatch
  - writes the ordered result table through `export_runtime::export_query_result_xlsx`
  - logs success or structured failure

### `export_query_result_pdf_command(export_path, query_name, result) -> ()`

- Purpose: export the current query result table to a PDF report
- Backend flow:
  - rejects empty export paths before dispatch
  - writes a paginated PDF report through `export_runtime::export_query_result_pdf`
  - logs success or structured failure

### `start_export_query_result_job(export_path, query_name, result, format) -> JobHandle`

- Purpose: start a tracked background job for CSV, XLSX, or PDF query-result export
- Backend flow:
  - validates the export path
  - registers a tracked job through `job_runner::JobRegistry`
  - runs the chosen export writer with cancellation checks
  - returns a `job_id` immediately so the frontend can poll and cancel

### `get_job_status(job_id) -> JobSnapshot | null`

- Purpose: fetch the current status of a tracked background job
- Backend flow:
  - looks up the in-memory job registry
  - returns the latest status, message, completion flag, and duration when the job exists

### `cancel_job(job_id) -> boolean`

- Purpose: request cancellation for a tracked background job
- Backend flow:
  - marks the job's cancellation token when the job is still running or queued
  - returns `true` when the request was accepted

## Structured Error Shape

All command failures use the serialized `AppError` contract:

```json
{
  "code": "query_execution_error",
  "message": "The query could not be executed.",
  "details": "Unknown field in query: revenue_total"
}
```

The frontend relies on:

- stable `code`
- readable `message`
- optional `details`

## Logging Contract

Key commands emit structured JSON-line backend logs through `telemetry` for:

- start
- success
- failure

The payload includes command-specific context such as file path, query identity, row counts, and duration.
