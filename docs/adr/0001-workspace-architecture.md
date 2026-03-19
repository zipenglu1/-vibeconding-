# ADR-0001: Workspace Architecture

- Status: accepted
- Date: 2026-03-15

## Context

The product is an offline-first desktop BI application with a Tauri frontend, Rust backend logic, local metadata persistence, and a growing set of shared frontend packages and Rust crates. The repository needs to support:

- isolated Rust crate testing for analytics, metadata, ingestion, export, jobs, and telemetry
- shared frontend package extraction without splitting the app into multiple repositories
- incremental architecture alignment with the target structure defined in `AGENT.md`

## Decision

Use a single monorepo with:

- `pnpm` workspace for frontend packages
- Cargo workspace for Rust crates and the Tauri desktop app

Keep the runtime split aligned to these top-level areas:

- `apps/desktop`: the Tauri application shell and frontend runtime
- `crates/analytics-core`: semantic query execution and planning
- `crates/connectors`: source parsing and Parquet cache materialization
- `crates/metadata-store`: SQLite-backed project metadata persistence
- `crates/export-runtime`: snapshot export logic
- `crates/job-runner`: reusable command timing and job wrappers
- `crates/telemetry`: structured backend logging
- `packages/ui-kit` and `packages/chart-presets`: shared frontend UI and chart layers

## Consequences

Positive:

- backend and frontend boundaries can evolve independently while staying in one repository
- targeted crate validation is possible when full desktop builds are expensive
- architecture alignment tasks can move live code into target boundaries incrementally

Tradeoffs:

- desktop-crate validation still pulls heavy analytics dependencies through the workspace graph
- Windows/MSVC validation can be slow because DuckDB and Polars are compiled in the same workspace context
