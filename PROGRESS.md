# PROGRESS.md - Project Status

## Date
2026-03-17

## Current State

The project now has core feature coverage plus the intended frontend state-management foundation, a frontend runtime structure that is materially closer to the `AGENT.md` target, a Tailwind- and shadcn-style component baseline for the main desktop screen, active `ui-kit`, `chart-presets`, and `ts-contracts` frontend packages, structured error handling, structured logging, broader Rust unit-test and integration-test coverage, browser-driven E2E coverage, an optimized chart-loading path, a repository scaffold aligned more closely with `AGENT.md`, a DuckDB-only analytics path in `analytics-core`, active `connectors`, `export-runtime`, `job-runner`, and `telemetry` workspace crates for backend boundary alignment, an initial Parquet cache ingestion flow for imported CSV datasets, a production Parquet semantic query path that now executes through DuckDB, a tracked profiling workflow surfaced through the desktop workbench, a desktop backend that now matches the target Tauri runtime module boundaries in `AGENT.md`, an `analytics-core` crate that now matches the target internal module boundaries, populated architecture documentation in the scaffolded `docs/` directories, active CI workflow definitions for frontend, Rust, and E2E validation, active repository script entrypoints under `scripts/dev`, `scripts/data`, and `scripts/packaging`, active `field-pane` and `filter-bar` frontend feature modules in the workbench, an active widgets layer for the workspace and dashboard page assemblies, an active shared drag-and-drop layer for field-to-query mapping interactions, active frontend entity modules for field, chart, and dashboard domain models, an active `analytics-core::suggestions` module for reusable field/chart suggestion generation, an active `analytics-core::chart_specs` module for reusable chart-spec generation, a desktop integration path that surfaces backend-generated recommendations in the workbench, a dashboard render path that now consumes backend-generated chart specs, a unified shared chart-spec state lifecycle across recommendation apply and dashboard rendering, browser-driven E2E coverage for the recommendation and backend chart-spec flow, direct Rust command-boundary coverage for the desktop recommendation and chart-spec backend commands, a frontend entrypoint that now boots fully through the `app` layer instead of legacy root runtime folders, an active `dataset-import` feature module that now owns CSV selection, load controls, data-source summaries, and preview composition, a thin `WorkbenchPage` route wrapper over runtime- and widget-driven page assemblies, a dedicated `useWorkbenchRuntime.ts` boundary that now owns workbench runtime orchestration, a `shared/api` workbench boundary that now wraps raw Tauri command names and dialog flows behind domain-focused helpers, dedicated workbench React Query hooks that now keep saved-project and recommendation query wiring out of page composition, and a dedicated workbench action layer that now keeps command-side effects out of the page/widget assembly flow. The strict audit backlog is closed, and the repository now also includes a reviewed desktop browser-validation wrapper that codifies the stable typecheck-plus-Playwright flow against the root `tests/e2e` suite.

The desktop workbench chrome now also supports a persisted English/Chinese language toggle from the home hero area, because there is still no separate settings surface.

- CSV, Excel, Parquet, and SQLite files can be selected and loaded into the desktop UI.
- Multiple loaded data sources can be switched in the current session.
- Projects can be intentionally saved with stable ids and reopened from a saved project list.
- The current in-memory project can be exported to a JSON snapshot file through a user-facing flow.
- Exported JSON project snapshots can now be imported, validated, restored into the local project store, and hydrated through their embedded data-source definitions.
- Projects can now store and reopen more than one named dashboard view while remaining compatible with older single-view project metadata.
- Saved dashboard views can now persist editable section order and width choices for chart, query, and table sections.
- The workspace can now preview query results directly with sortable columns and bounded paging, using the same table rendering surface as the dashboard.
- The workspace now includes a persistent job activity panel for recent export jobs with status, message, duration, and cancellation affordances.
- The desktop Playwright suite now covers export-job completion, export-job cancellation, and JSON snapshot import roundtrip flows with a richer mocked Tauri bridge.
- The current query result can now be exported to CSV through a user-facing desktop flow.
- The current query result can now be exported to XLSX and PDF through user-facing desktop flows.
- Query-result exports now run through tracked background jobs with status polling and cancellation.
- The backend can execute semantic queries against CSV data sources.
- The frontend can invoke semantic query execution through a Tauri command and render query results.
- The frontend now includes a basic query builder for dimensions, measures, and filters.
- The frontend screen now uses reusable layout primitives for shell, grid, and panel sections.
- The frontend can render basic charts from query results through a reusable chart component.
- The frontend now has a dedicated dashboard mode that assembles analysis results into one view.
- The desktop backend now returns structured application errors with stable error codes and details.
- The desktop frontend now converts structured Tauri command failures into clearer user-facing error banners with title, message, details, and error code.
- The desktop backend now emits structured JSON-line logs for key Tauri commands.
- The desktop frontend now records structured JSON-line logs for key UI interactions and command flows.
- The core Rust crates now have broader baseline unit coverage beyond the original happy-path tests.
- The desktop frontend now has Playwright E2E coverage for key user-facing flows.
- The desktop frontend now has a shared React Query provider and a Zustand UI store in active use.
- The desktop frontend now loads charting dependencies outside the main application chunk.
- The repository now includes the missing target scaffold directories called for in `AGENT.md`.
- A new alignment backlog now tracks the remaining gaps against the full `AGENT.md` target architecture and technology stack.
- The Rust workspace now builds with DuckDB-only cached-Parquet execution inside `analytics-core`.
- `analytics-core` now includes a centralized DuckDB query AST and renderer that keeps SQL construction out of the execution and profiling production paths.
- The desktop frontend runtime code now lives under active `app`, `pages`, `features`, `shared`, and `entities` directories instead of remaining concentrated in the root `src` layer.
- The desktop frontend now uses a Tailwind global stylesheet and reusable shadcn-style shared UI primitives as its primary UI layer.
- The desktop frontend now consumes shared UI and chart code through active `packages/ui-kit` and `packages/chart-presets` workspace packages.
- Source parsing and Parquet cache materialization now run through the dedicated `connectors` crate instead of the temporary `analytics-core` loader boundary.
- JSON project snapshot export now runs through the dedicated `export-runtime` crate instead of the desktop crate owning export serialization directly.
- Structured backend log formatting and emission now run through the dedicated `telemetry` crate, and command timing now runs through the dedicated `job-runner` crate.
- Imported CSV and Excel datasets now materialize Parquet cache artifacts under the desktop workspace cache path.
- Existing Parquet datasets can now be opened directly without generating a second derived cache artifact.
- SQLite snapshot imports can now materialize Parquet cache artifacts from the first user table in a local database file.
- Project metadata can now retain an optional cached Parquet path for each stored data source.
- Project metadata can now persist dashboard query-builder state, chart specs, and layout metadata across save and reopen flows.
- Semantic queries now prefer cached Parquet data through DuckDB when a cache path is available.
- The desktop Tauri backend code now lives in target `commands`, `app_state`, `bootstrap`, `services`, and `security` modules instead of a monolithic `lib.rs`.
- The scaffolded `docs/adr`, `docs/api`, `docs/product`, and `docs/runbooks` directories now contain implementation-aligned documentation instead of placeholder README files only.
- The repository now includes active GitHub Actions workflow files for frontend build checks, Rust validation, and Playwright E2E coverage.
- The desktop frontend now consumes shared command contract types from `packages/ts-contracts` instead of keeping duplicate local contract definitions for semantic queries, data sources, and project metadata.
- The `analytics-core` crate now uses target internal modules for dataset I/O, profiling, semantic contracts and row processing, parquet planning, execution, and future-boundary placeholders for suggestions and chart specs instead of a monolithic `src/lib.rs`.
- The scaffolded `tests/integration` area now includes active Rust integration smoke coverage through a dedicated workspace test crate.
- The scaffolded `scripts/dev`, `scripts/data`, and `scripts/packaging` directories now contain executable repository helpers instead of README-only placeholders.
- The scaffolded `field-pane` and `filter-bar` frontend feature directories now contain active workbench components instead of README-only placeholders.
- The scaffolded `widgets` frontend directory now contains active workspace and dashboard assemblies instead of a README-only placeholder.
- The scaffolded `shared/dnd` frontend directory now contains active reusable drag-and-drop helpers instead of a README-only placeholder.
- The scaffolded frontend `entities` layer now contains active field, chart, and dashboard model modules instead of being limited to dataset/project placeholders.
- The scaffolded `analytics-core::suggestions` module now contains a real suggestion engine instead of a placeholder-only boundary.
- The scaffolded `analytics-core::chart_specs` module now contains a real chart-spec builder instead of a placeholder-only boundary.
- The desktop stack now exposes backend-generated query suggestions and chart specs through the Tauri command boundary.
- The desktop dashboard chart renderer now consumes backend-generated chart specs instead of relying only on frontend-local inference.
- Recommendation apply and dashboard rendering now share one chart-spec state path instead of maintaining separate frontend derivations.
- The frontend E2E suite now covers applying backend recommendations and exercising the backend chart-spec dashboard path.
- The desktop Rust test suite now directly covers the recommendation and chart-spec Tauri command boundary.
- The desktop frontend entrypoint now boots through `src/app`-owned bootstrap and provider wiring instead of a root-level `providers` folder.
- The desktop workbench now routes CSV selection, path entry, load triggers, data-source summaries, and preview rendering through `features/dataset-import`.
- `WorkbenchPage.tsx` no longer owns inline UI error parsing, project metadata assembly, query-builder/query derivation helper implementations, or any controller-era orchestration path.
- `useWorkbenchRuntime.ts` now owns the workbench runtime orchestration that was previously spread across page-local controller code.
- The workbench runtime now consumes domain-focused helpers from `shared/api/workbenchApi.ts` instead of calling raw Tauri command names directly.
- The workbench runtime now consumes dedicated workbench React Query hooks instead of defining saved-project and recommendation queries inline in page composition.
- The workbench runtime now consumes dedicated workbench command actions instead of implementing load/save/export/open/run-query flows inline in page composition.
- The workbench runtime now consumes dedicated shared interaction helpers instead of implementing data-source activation, query-builder updates, chart-variant changes, and view toggles inline.
- The workbench runtime now consumes a dedicated shared effects hook instead of implementing saved-project logging, active-data-source synchronization, view-mode logging, and recommendation failure handling inline.
- The workbench runtime now consumes dedicated shared model hooks instead of implementing active-data-source selection, semantic-query derivation, dashboard model assembly, and primary recommendation selection inline.
- The workbench runtime now consumes dedicated shared view prop builders instead of assembling the hero state and workspace/dashboard widget props inline.
- The workbench runtime now consumes a dedicated shared state hook instead of owning local workbench `useState` declarations and app UI store selector wiring inline in route-level code.
- `WorkbenchPage.tsx` is now only a thin route wrapper over `widgets/page/WorkbenchRuntimeWidget.tsx`.
- `WorkbenchRuntimeWidget.tsx` now binds `useWorkbenchRuntime()` to the shell widget.
- `WorkbenchShellWidget.tsx` now owns the `AppShell` composition over the hero and body widgets.
- `WorkbenchHeroWidget.tsx` now owns the hero copy, mode buttons, and status/error banners.
- `WorkbenchBodyWidget.tsx` now owns the workspace-versus-dashboard widget switch.
- The active page/widget/shared README files now describe the current runtime-to-widget architecture and no longer refer to the removed controller-era page boundary.
- The remaining active helper boundary names now avoid controller-era terminology and align with the current runtime/view/widget architecture.
- The extracted page widget naming is now internally consistent around runtime, shell, hero, and body responsibilities.
- The chart chunk warning is now explicitly tracked as a follow-up task instead of remaining only as repeated build output.
- There is now a documented implementation recommendation for the chart chunk warning: selective `echarts/core` imports before more chunk tuning.
- The chart lazy chunk now uses selective ECharts core imports and has been reduced materially, though it still sits slightly above Vite's default warning threshold.
- The remaining chart chunk threshold overrun is now an explicitly accepted tradeoff, and the build warning has been silenced through a reviewed Vite threshold aligned to the lazy chart bundle size.
- The current `AGENT.md` alignment backlog is complete, and the next backlog now focuses on snapshot portability, richer dashboard editing, result exploration, and regression coverage.

## Completed This Round

### Bilingual desktop UI
- Added a persisted `language` setting in the shared Zustand UI store so the desktop remembers the user's English/Chinese choice across reloads.
- Introduced a shared bilingual copy map in `apps/desktop/src/shared/lib/i18n.ts` and wired the hero, dataset import, workspace panels, dashboard, result table, and key frontend status messages to it.
- Added a hero-level language selector in `widgets/hero/WorkbenchHeroWidget.tsx`, which satisfies the current requirement to expose language switching on the home screen while there is still no dedicated settings page.
- Extended the root Playwright suite with a dedicated language-toggle regression and revalidated the full browser wrapper after updating existing assertions to the new friendly localized job labels.

### AGENT.md compliance audit
- Re-read `AGENT.md` against the current repository tree and concluded that the project does not yet fully satisfy the documented target architecture and process requirements.
- Confirmed that the intended monorepo structure is largely in place across `apps/desktop`, `crates`, `packages`, `docs`, `scripts`, `tests`, and `.github/workflows`.
- Confirmed that the active desktop product now covers file import, cached-query execution, dashboard persistence, export jobs, snapshot roundtrip import, and browser-driven workflow regression coverage.
- Identified explicit remaining compliance gaps: missing root `README.md`, `.env.example`, and `rust-toolchain.toml`; no lint scripts or lint CI gate; no automated performance regression coverage for the cached analytics path; and a UI primitive layer that is Tailwind-based but not yet demonstrably backed by shadcn/ui plus Radix dependencies.
- Converted those gaps into a new `EPIC-7` backlog so the next phase is tracked in the same task ledger instead of remaining as ad hoc audit notes.

### Repository baseline compliance
- Added a root `README.md` that documents the current workspace layout, prerequisites, common commands, validation flow, sample-data scripts, packaging scripts, and current product surface.
- Added a root `.env.example` that makes the current no-required-runtime-env baseline explicit while reserving a stable location for future optional overrides.
- Added a root `rust-toolchain.toml` that standardizes the repository on the stable Rust toolchain with `rustfmt` and `clippy` available.
- Closed the first AGENT.md compliance task and advanced the next single task to lint script and CI enforcement.

### Lint scripts and CI enforcement
- Added a root ESLint flat config that covers desktop frontend source, desktop E2E tests, and shared frontend packages while ignoring generated artifacts and vendored folders.
- Added root `pnpm lint`, `pnpm lint:frontend`, and `pnpm lint:rust` scripts so frontend and Rust lint checks now have explicit stable entrypoints.
- Updated `scripts/dev/validate-workspace.ps1` to run frontend lint and Rust formatting checks before the existing typecheck and cargo validation steps.
- Added explicit lint steps to GitHub Actions so frontend lint now runs in `frontend-build.yml` and Rust formatting checks now run in `rust-validation.yml`.
- Cleaned up the small frontend code issues surfaced by the new lint baseline instead of weakening the rules.

### UI stack compliance exception
- Added ADR-0003 to document an accepted exception to the original AGENT.md `shadcn/ui + Radix UI` requirement.
- Kept the current Tailwind-based `packages/ui-kit` and `components.json` workflow as the active desktop UI foundation instead of forcing a late component-library rewrite with broad UI churn.
- Recorded that future Radix-backed adoption is now optional hardening work, not a blocking repository compliance requirement.

### Cached analytics performance regression coverage
- Added an ignored integration test, `cached_query_perf_regression_guard`, that generates a large CSV fixture, materializes a Parquet cache, executes a cached semantic query, and enforces configurable cache/query thresholds.
- Added `scripts/dev/run-cached-query-perf.ps1` as the stable wrapper for running that guard through the `stable-x86_64-pc-windows-msvc` toolchain in release mode with row-count and threshold parameters.
- Documented the new performance guard in the root README, the dev-script README, and the integration-test README so the evidence path is discoverable from the repository root.
- Captured the first validated baseline with two successful runs:
- `250000` rows: cache materialization `432 ms`, cached query execution `43 ms`
- `1000000` rows: cache materialization `1347 ms`, cached query execution `38 ms`

### Broader job-runner adoption
- Moved desktop data-source loading onto tracked background jobs by adding `start_load_data_source_job` and `take_load_data_source_job_result` commands plus a result handoff store in the Tauri app state.
- Added cancellation-aware connector loading for CSV cache materialization, so the first non-export job path now checks a cancellation token during row ingestion and before cache persistence.
- Switched the frontend workbench import path from the synchronous `load_data_source` command to start/poll/take job orchestration while keeping the existing export-job panel and cancellation behavior intact.
- Extended the Playwright browser-mode mock backend so `load_data_source` now appears in the shared job activity panel, and verified that export-job flows still pass unchanged.
- Confirmed the reviewed Windows validation path for this round through `stable-x86_64-pc-windows-msvc`; the next remaining validation-hardening task is to standardize repository guidance and helper scripts on that toolchain instead of the failing GNU default.

### Windows MSVC validation standardization
- Added `scripts/dev/invoke-rust-command.ps1` as the shared Rust wrapper that automatically selects `stable-x86_64-pc-windows-msvc` on Windows unless an explicit override is provided.
- Updated `scripts/dev/validate-workspace.ps1` so its heavy Rust checks now run through that wrapper instead of the failing default GNU cargo path.
- Updated the root README, `scripts/dev/README.md`, and `docs/runbooks/development-validation.md` so Windows validation guidance now points to the wrapper and explicit MSVC cargo commands for desktop and connector checks.
- Updated `.github/workflows/rust-validation.yml` so the Windows Rust CI workflow installs and invokes the MSVC toolchain explicitly, keeping local guidance and CI on the same reviewed path.
- The GNU `os error 193` ambiguity is now removed from repository guidance; the next remaining Windows validation problem is local disk-space and linker/PDB pressure once the heavy target directory grows.

### Windows Rust artifact-pressure mitigation
- Extended `scripts/dev/invoke-rust-command.ps1` so validation callers can isolate Cargo artifacts with `-TargetDir`, disable incremental compilation, and add `-C debuginfo=0` without changing normal developer build defaults.
- Updated `scripts/dev/validate-workspace.ps1` to send its Rust checks through `target/validation-msvc-check` instead of the shared workspace `target` tree.
- Added an automatic reset for that validation-only target cache when it exceeds `6 GB`, so repeated local validation runs do not inherit avoidable artifact growth from earlier checks.
- Updated the root README, `scripts/dev/README.md`, and the development validation runbook to document the dedicated validation cache and its lower-artifact settings.
- Closed `TASK-7.3.4`, which completes the currently tracked `EPIC-7` AGENT.md compliance hardening backlog.

### Strict AGENT.md audit and reopened backlog
- Re-read `AGENT.md` in UTF-8 and traversed the actual repository tree, package manifests, Rust crates, frontend modules, and CI workflows instead of relying on the previously closed backlog alone.
- Confirmed that the repository shape, core offline cache flow, Parquet-backed query path, project persistence, import/export coverage, React Query usage, Zustand usage, and ECharts lifecycle cleanup are materially implemented.
- Confirmed that the project is still not fully compliant with AGENT.md under a strict reading.
- Found a direct prohibition breach: the Parquet query path in `crates/analytics-core` still assembles executable SQL via `format!` and `push_str`.
- Found a remaining UI-stack gap: the live `packages/ui-kit` layer currently re-exports local Tailwind components and does not demonstrate actual Radix-backed shadcn/ui primitives in the active package manifests.
- Found remaining scope gaps: `job-runner` is active for import/export but not yet for profiling or cache-warmup flows, and `telemetry` is visibly implemented for structured logs more than for local metric sampling and debug toggles.
- Reopened the AGENT alignment backlog as `EPIC-8` and set `TASK-8.1.1` as the next single task.

### Parquet query safety compliance
- Replaced the old SQL-string Parquet planner with a structured `PlannedParquetQuery` model in `crates/analytics-core/src/planner/mod.rs`.
- Replaced the Parquet DuckDB SQL executor path with a Polars DataFrame execution path in `crates/analytics-core/src/executor/mod.rs`, covering filtering, grouped aggregation, dimension-only selection, measure-only aggregation, sorting, and pagination without assembling executable SQL fragments in production code.
- Removed the previously audited `format!` / `push_str` SQL assembly from the production Parquet query path.
- Added Parquet regression tests in `crates/analytics-core/src/lib.rs` for grouped aggregation, count-distinct, filtering, sorting, and pagination.
- Closed `TASK-8.1.1` and advanced the next single task to the remaining live UI-stack compliance gap.

### Live UI-stack compliance
- Replaced the old `packages/ui-kit` re-export-only package surface with real package-local component implementations for `Button`, `Input`, `Card`, `Badge`, and `Select`.
- Added actual shadcn-style utility dependencies to `packages/ui-kit`: `class-variance-authority`, `clsx`, and `tailwind-merge`.
- Added actual Radix dependencies to `packages/ui-kit`: `@radix-ui/react-slot` and `@radix-ui/react-select`.
- Migrated the workbench field and filter builder flows onto the new Radix-backed `Select` API in `FieldPane.tsx` and `FilterBar.tsx`.
- Updated desktop package shims so app-local TypeScript resolution points at the real `packages/ui-kit` sources instead of the previous local app primitive re-exports.
- Closed `TASK-8.2.1` and advanced the next single task to the remaining job-runner scope gap for profiling or cache-warmup workflows.

### Strict re-audit and backlog reset
- Re-read `AGENT.md`, `TASKS.json`, `PROGRESS.md`, `TODO_NOW.md`, `DECISIONS.md`, and `RISKS.md`, then spot-checked the live repository structure and the current backend/frontend implementation before resuming work.
- Confirmed that the repository is not fully aligned with `AGENT.md` under a literal reading, even though the previous tracked strict-gap backlog had been marked complete.
- Identified the highest-priority architecture drift in `crates/analytics-core/src/executor/mod.rs`: cached Parquet semantic queries currently execute through a Polars DataFrame path, while `AGENT.md` requires the cache query path to aggregate through DuckDB.
- Identified the next remaining lifecycle gap: `job-runner` now covers import, export, and cache warmup, but `crates/analytics-core/src/profiling/mod.rs` is still only a stack verification helper rather than a tracked profiling workflow.
- Created `EPIC-10` in `TASKS.json`, set `TASK-10.1.1` as the only active task in `TODO_NOW.md`, and updated the status documents so the next implementation round resumes from one explicit AGENT parity target instead of an idle state.

### Engine comparison harness
- Shifted the immediate next step from an assumed DuckDB rollback to an evidence-first engine decision after you explicitly asked to benchmark DuckDB against the current Polars executor before choosing the production path.
- Added a repeatable benchmark harness to `crates/analytics-core/src/lib.rs` that generates a cached Parquet fixture, executes the same grouped aggregate query through the live `QueryEngine` and a DuckDB comparison query, verifies that both engines return the same result shape, and prints per-run timings plus median timings.
- Added `scripts/dev/compare-cached-query-engines.ps1` as the stable wrapper for running that ignored benchmark test with configurable row count and iteration count.
- Worked around the local Windows/MSVC build friction by switching benchmark execution to a short target directory (`E:\\x`) and the debug test profile after the release path proved too heavy for this machine.
- Recorded successful local benchmark evidence for the same cached Parquet aggregate query:
- `100000` rows: Polars median `124 ms`, DuckDB median `149 ms`
- `250000` rows: Polars median `319 ms`, DuckDB median `166 ms`
- `500000` rows: Polars median `444 ms`, DuckDB median `127 ms`
- Concluded from those measurements that Polars is only marginally faster at the smaller sample, while DuckDB scales materially better once the cached dataset grows into the product's more relevant range.
- Closed `TASK-10.1.1` with benchmark evidence and advanced the current single task to `TASK-10.1.2`, which now applies the chosen DuckDB-backed cached-Parquet production path under the existing safe-query constraints.

### DuckDB production executor restore
- Replaced the production cached-Parquet executor in `crates/analytics-core/src/executor/mod.rs` with a DuckDB-backed path; the later profiling round then removed the remaining Polars comparison fallback entirely.
- Moved Parquet schema validation onto DuckDB itself with `SELECT * FROM read_parquet(?) LIMIT 0`, so the live query path no longer needs to materialize the whole Parquet file into a Polars frame just to read headers before execution.
- Added a constrained DuckDB query renderer that only emits SQL from the validated query plan, quotes identifiers from that plan, and binds runtime filter plus pagination values as statement parameters.
- Kept grouped aggregations, measure-only aggregations, dimension-only selection, sorting, and pagination working through the restored DuckDB path.
- Re-ran the engine benchmark after the production swap and recorded a still-positive DuckDB result at `250000` rows: `polars_median_ms=205`, `duckdb_median_ms=188`.
- Validated the production swap with `cargo +stable-x86_64-pc-windows-msvc check -p analytics-core --tests` plus three targeted Parquet regression tests for grouped, measure-only, and dimension-only query shapes.
- Removed the temporary short target directories used only for local benchmarking and validation in this round: `E:\\x` and `E:\\c2`.

### Profiling job parity and DuckDB-only cleanup
- Completed `TASK-10.2.1` by replacing the previous `analytics-core::profiling` stack-smoke helper with a DuckDB-backed profiling path that returns row counts, field counts, null/non-null counts, distinct counts, and sample values for cached Parquet sources.
- Added backend tracked-job support for profiling through `start_profile_data_source_job` and `take_profile_data_source_job_result`, plus a dedicated profiling-result store in the Tauri app state.
- Extended the workbench API, runtime state, and workspace action layer so profiling now follows the same start/poll/result-handoff pattern as the other tracked jobs.
- Added a `Profile Data` workspace action and a compact profile summary panel, while continuing to surface profiling lifecycle and cancellation through the existing recent-jobs activity panel.
- Removed the last Polars execution fallback from `crates/analytics-core/src/executor/mod.rs`, removed the `polars` dependency from `crates/analytics-core/Cargo.toml`, and deleted the temporary `scripts/dev/compare-cached-query-engines.ps1` comparison wrapper.
- Validated this round with `cargo +stable-x86_64-pc-windows-msvc check -p analytics-core --tests`, targeted `analytics-core` DuckDB and profiling tests, `cargo +stable-x86_64-pc-windows-msvc check -p desktop --lib`, and `pnpm --filter desktop build`.

### Follow-up AGENT.md re-audit
- Re-read `AGENT.md`, re-checked the live repository structure, and spot-checked the current analytics-core and desktop implementation after closing `TASK-10.2.1`.
- Confirmed that the previously open architecture gaps around DuckDB production execution and profiling tracked jobs are now closed in code and docs.
- Found one remaining literal architecture-compliance gap: `crates/analytics-core/src/executor/mod.rs` and `crates/analytics-core/src/profiling/mod.rs` still render executable DuckDB SQL strings via `write!` and `format!`, which remains out of line with the AGENT.md prohibition on directly concatenating SQL in code under a strict reading.
- Found one remaining validation-depth gap: profiling has backend commands and UI surfacing, but the automated workflow coverage still focuses on import/export and does not yet exercise a profiling job roundtrip.
- Converted those findings into a new `EPIC-11` backlog and promoted `TASK-11.1.1` as the new current single task.

### Centralized DuckDB query rendering boundary
- Added `crates/analytics-core/src/duckdb_sql.rs` as a constrained DuckDB query AST plus renderer so semantic-query and profiling code now build structured queries instead of rendering SQL fragments inline.
- Migrated `crates/analytics-core/src/executor/mod.rs` to assemble cached-Parquet selects, filters, grouping, sorting, row-count wrappers, and pagination through the AST while preserving bound parameters.
- Migrated `crates/analytics-core/src/profiling/mod.rs` to assemble field stats and sample queries through the same AST boundary, including distinct sampling and static literal limits.
- Added renderer unit coverage for nested subqueries, escaped identifiers, row-count wrappers, and parameter placeholders.
- Revalidated the DuckDB cached-Parquet execution and profiling paths with targeted `analytics-core` checks and regression tests, then advanced the current single task to profiling job workflow coverage.

### Profiling workflow regression coverage
- Extended `apps/desktop/e2e/app.spec.ts` with a profiling-job mock result and a full workspace roundtrip that validates `Profile Data`, job activity surfacing, result handoff, and rendered profile field samples.
- Reran the full desktop Playwright spec file after adding the new profiling coverage so the existing import, query, recommendation, project, and export flows remain green alongside the new test.
- Fixed a real frontend crash uncovered by the new coverage by teaching `packages/ui-kit/src/Select.tsx` to map empty placeholder values through a non-empty internal sentinel before handing them to Radix Select items.
- Updated the older recommendation E2E assertion to match the current Radix combobox implementation instead of the removed native `<select>` markup.

### Strict re-audit after EPIC-11 closure
- Re-ran a strict repository audit against `AGENT.md` after `EPIC-11` was completed, checking the root tree, workspace crates/packages, root test scaffolds, active CI E2E entrypoints, and the current desktop Playwright suite location.
- Confirmed that no new user-facing feature or runtime-architecture gap remains in the shipped desktop product surface relative to the document's intent.
- Found one remaining literal directory-layout mismatch: `tests/e2e/` still contains only `README.md`, while the live Playwright suite and CI command continue to run from `apps/desktop/e2e/app.spec.ts`.
- Opened `EPIC-12` to track that smaller layout-parity issue before starting generic performance/stability cleanup.

### Root E2E layout parity
- Moved the live desktop Playwright suite from `apps/desktop/e2e/app.spec.ts` to `tests/e2e/desktop.app.spec.ts` so the active browser-driven tests now live in the root scaffold described by `AGENT.md`.
- Updated `apps/desktop/playwright.config.ts` so `pnpm -C apps/desktop e2e` still works, but now resolves its `testDir` from the root `tests/e2e` directory.
- Updated `tests/e2e/README.md` to document that the root scaffold is now the canonical host for the desktop browser suite.
- Removed the now-empty `apps/desktop/e2e` directory.
- Revalidated the full desktop Playwright suite through the unchanged desktop entrypoint after the move.

### Desktop browser validation hardening
- Added `scripts/dev/run-desktop-browser-validation.ps1` as the reviewed stable browser-validation wrapper for the desktop frontend.
- Exposed that wrapper through the root `pnpm validate:desktop-browser` script so the repository now has one explicit command for desktop frontend typecheck plus browser E2E.
- Updated the root frontend lint path from `apps/desktop/e2e` to `tests/e2e` after the suite migration.
- Hardened the Playwright `showWorkspace` helper in `tests/e2e/desktop.app.spec.ts` to use the accessible `Workspace` button selector, which resolved a flaky browser-validation failure surfaced by the new wrapper.
- Verified that the wrapper cleans `apps/desktop/test-results` and `apps/desktop/playwright-report` by default after successful runs.

## Validation Evidence

- Latest round:
- `cargo fmt --all`
- `cargo +stable-x86_64-pc-windows-msvc check -p analytics-core --tests`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core duckdb_sql::tests -- --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::executes_grouped_semantic_query_against_parquet_cache -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::executes_measure_only_parquet_query_with_count_distinct_and_pagination_metadata -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::executes_dimension_only_parquet_query_with_sort_and_pagination -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::profiles_parquet_data_source_through_duckdb -- --exact --nocapture`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `pnpm -C apps/desktop exec playwright test e2e/app.spec.ts --timeout 60000 --workers 1`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `pnpm -C apps/desktop exec playwright test --timeout 60000 --workers 1`
- `pnpm lint:frontend`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-browser-validation.ps1`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo test -p desktop --no-run`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo test -p desktop --no-run`
- `cargo fmt --all`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo test -p metadata-store`
- `cargo test -p export-runtime`
- `cargo test -p desktop --no-run`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo test -p metadata-store`
- `cargo test -p export-runtime`
- `cargo test -p desktop --no-run`
- `cargo test -p export-runtime`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo test -p desktop --no-run` reached desktop compilation but failed in this environment with Windows `os error 112` while writing `desktop_lib.lib`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `pnpm -C apps/desktop e2e`
- `[System.IO.File]::ReadAllText('AGENT.md',[System.Text.Encoding]::UTF8)`
- `Get-ChildItem -Name`
- `Get-ChildItem -Recurse apps | Select-Object FullName`
- `Get-ChildItem -Recurse crates | Select-Object FullName`
- `Get-ChildItem tests -Recurse | Select-Object FullName`
- `Get-ChildItem packages -Recurse | Select-Object FullName`
- `Get-ChildItem .github/workflows | Select-Object Name`
- `@(Test-Path rust-toolchain.toml); @(Test-Path .env.example); @(Test-Path README.md)`
- `Get-Content packages/ui-kit/package.json`
- `Get-Content .github/workflows/frontend-build.yml`
- `Get-Content .github/workflows/frontend-e2e.yml`
- `Get-Content .github/workflows/rust-validation.yml`
- `Get-Content packages/chart-presets/src/QueryResultChart.tsx`
- `Get-ChildItem tests | Select-String -Pattern 'perf|performance|benchmark'`
- `Get-Content Cargo.toml`
- `Get-Content pnpm-workspace.yaml`
- `Get-Content scripts/dev/validate-workspace.ps1`
- `Get-Content scripts/data/generate-sample-csv.ps1`
- `Get-Content scripts/packaging/build-desktop.ps1`
- `Get-Content apps/desktop/src-tauri/Cargo.toml`
- `Get-Content package.json`
- `@(Test-Path README.md); @(Test-Path .env.example); @(Test-Path rust-toolchain.toml)`
- `pnpm add -Dw eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals`
- `pnpm add -Dw eslint@^9.39.1`
- `pnpm add -Dw @eslint/js@^9.39.1`
- `pnpm lint:frontend`
- `pnpm lint:rust`
- `pnpm lint`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1`
- `Get-Content apps/desktop/components.json`
- `Get-Content packages/ui-kit/src/index.ts`
- `Get-Content packages/ui-kit/src/Button.tsx`
- `Get-Content packages/ui-kit/src/Input.tsx`
- `Get-Content packages/ui-kit/src/Select.tsx`
- `Get-Content docs/adr/0001-workspace-architecture.md`
- `Get-Content docs/adr/0002-desktop-backend-module-boundaries.md`
- `cargo fmt --all`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-cached-query-perf.ps1 -RowCount 250000 -CacheThresholdMs 120000 -QueryThresholdMs 15000`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-cached-query-perf.ps1`
- `cargo fmt --all`
- `pnpm lint`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `cargo +stable-x86_64-pc-windows-msvc test -p connectors`
- `cargo +stable-x86_64-pc-windows-msvc test -p desktop --no-run`
- `pnpm -C apps/desktop e2e`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 --version`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "check -p job-runner" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "check -p desktop"` reached the reviewed MSVC path but failed in this environment with Windows `os error 112` after target-directory growth exhausted local disk space
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1` now routes through the reviewed MSVC path, but the local run still failed in this environment with Windows `os error 112` during heavy crate metadata output
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1` after the artifact-pressure mitigation did not finish before the tool timeout in this environment, so the new path is validated through the wrapper plus targeted crate checks rather than a completed full-script run
- `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw -Encoding UTF8 AGENT.md`
- `Get-ChildItem apps\\desktop\\src -Directory`
- `Get-ChildItem apps\\desktop\\src\\features -Directory`
- `Get-ChildItem apps\\desktop\\src\\shared -Directory`
- `Get-ChildItem apps\\desktop\\src-tauri\\src -Directory`
- `Get-ChildItem crates -Directory`
- `Get-ChildItem crates\\analytics-core\\src -Directory`
- `Get-ChildItem packages -Directory`
- `Get-ChildItem tests -Directory`
- `Get-ChildItem .github\\workflows`
- `Get-Content package.json`
- `Get-Content apps\\desktop\\package.json`
- `Get-Content packages\\ui-kit\\package.json`
- `Get-Content apps\\desktop\\components.json`
- `Get-Content apps\\desktop\\src\\shared\\lib\\appUiStore.ts`
- `Get-Content apps\\desktop\\src\\shared\\api\\workbenchApi.ts`
- `Get-Content apps\\desktop\\src\\shared\\api\\tauriBridge.ts`
- `Get-Content apps\\desktop\\src-tauri\\src\\commands\\mod.rs`
- `Get-Content crates\\analytics-core\\src\\planner\\mod.rs`
- `Get-Content crates\\analytics-core\\src\\executor\\mod.rs`
- `Get-Content crates\\metadata-store\\src\\lib.rs`
- `Get-Content crates\\connectors\\src\\lib.rs`
- `Get-Content crates\\analytics-core\\src\\lib.rs`
- `Get-Content tests\\integration\\tests\\offline_flows.rs`
- `Get-Content .github\\workflows\\rust-validation.yml`
- `Get-ChildItem apps\\desktop\\src,packages -Recurse -File -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '\\\\node_modules\\\\' } | Select-String -Pattern '\\bany\\b'`
- `Get-ChildItem apps,crates,packages,scripts,tests -Recurse -File -Include *.ts,*.tsx,*.rs,*.js,*.mjs,*.ps1 | Where-Object { $_.FullName -notmatch '\\\\node_modules\\\\' } | Select-String -Pattern 'TODO'`
- `Get-ChildItem crates,apps\\desktop\\src-tauri\\src -Recurse -File -Include *.rs | Select-String -Pattern 'format!\\(.*select|format!\\(.*SELECT|push_str\\(.*select|push_str\\(.*SELECT'`
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\dev\\invoke-rust-command.ps1 "check -p analytics-core" -TargetDir .\\target\\validation-msvc-check -DisableIncremental -NoDebuginfo`
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\dev\\invoke-rust-command.ps1 "test -p analytics-core --lib" -TargetDir .\\target\\validation-msvc-check -DisableIncremental -NoDebuginfo`
- `Get-ChildItem crates\\analytics-core\\src -Recurse -File -Include *.rs | Select-String -Pattern 'format!\\(.*SELECT|format!\\(.*select|push_str\\(.*SELECT|push_str\\(.*select|read_parquet\\('`
- `pnpm --dir packages/ui-kit add @radix-ui/react-select @radix-ui/react-slot class-variance-authority clsx tailwind-merge`
- `pnpm --dir packages/ui-kit add lucide-react`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `pnpm -C apps/desktop build`
- `Get-ChildItem -Recurse docs`
- `Get-ChildItem -Recurse apps/desktop/src`
- `Get-ChildItem -Recurse crates`
- `Get-Content AGENT.md`
- `Get-Content TASKS.json`
- `Get-Content PROGRESS.md`
- `Get-Content TODO_NOW.md`
- `cargo +stable-x86_64-pc-windows-msvc check -p analytics-core --tests`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::verifies_duckdb_stack -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::profiles_parquet_data_source_through_duckdb -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc test -p analytics-core tests::executes_grouped_semantic_query_against_parquet_cache -- --exact --nocapture`
- `cargo +stable-x86_64-pc-windows-msvc check -p desktop --lib`
- `pnpm --filter desktop build`
- `pnpm add -Dw prettier`
- `pnpm exec prettier --write "apps/desktop/src/**/*.{ts,tsx}" "packages/ts-contracts/src/**/*.ts"`
- `cargo +stable-x86_64-pc-windows-msvc test -p desktop commands::tests::resolves_profile_target_to_cached_parquet_path -- --exact --nocapture`
- `Get-ChildItem -Path 'apps/desktop/src' -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern '\bany\b'`
- `Get-ChildItem -Path '.' -Recurse -File -Include *.ts,*.tsx,*.rs,*.md,*.ps1 | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | Select-String -Pattern 'TODO'`
- `Get-Content packages/chart-presets/src/QueryResultChart.tsx`
- `Get-ChildItem tests -Directory`
- `Get-ChildItem apps/desktop/e2e -Recurse -File`
- `Get-ChildItem apps/desktop/e2e -Recurse -File | Select-String -Pattern 'profile|warm cache|job activity|export|import project'`
- `Get-ChildItem crates/analytics-core/src -Recurse -Filter *.rs | Select-String -Pattern 'SELECT .*read_parquet|format!\(|write!\('`
- Frontend validation summary:
- `pnpm -C apps/desktop exec tsc --noEmit` ran 17 times
- `pnpm -C apps/desktop build` ran 16 times
- `pnpm -C apps/desktop e2e` ran 7 times
- `pnpm --dir packages/ts-contracts typecheck` ran 5 times
- Rust validation summary:
- `cargo fmt --all` ran 3 times
- `cargo test -p analytics-core` ran 3 times
- `cargo test -p analytics-core --no-run` ran 4 times
- `cargo test -p desktop --no-run` ran 6 times
- One-off Rust checks:
- `cargo test -p job-runner`
- `cargo test -p connectors --no-run`
- `cargo test -p metadata-store --no-run`
- `cargo test -p desktop --lib`
- `cargo test -p integration-tests`
- `cargo test -p desktop commands::tests`
- Dependency and repository checks:
- `cargo tree -p desktop --depth 2` confirmed the desktop crate still validates through the DuckDB and Polars dependency path via `analytics-core`
- `Get-ChildItem -Recurse docs`
- `Get-ChildItem .github/workflows`
- `Get-Content .github/workflows/frontend-build.yml`
- `Get-Content .github/workflows/rust-validation.yml`
- `Get-Content .github/workflows/frontend-e2e.yml`
- Script entrypoint checks:
- `powershell -ExecutionPolicy Bypass -File .\scripts\data\generate-sample-csv.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\packaging\build-desktop.ps1 -FrontendOnly`

## Current Functional Baseline

- The desktop UI can switch freely between English and Chinese from the home hero area, and the choice now persists in local UI state.
- Native CSV file selection works
- CSV, Excel, Parquet, and SQLite loading work end to end
- Multiple loaded CSV files are tracked in the UI
- Active data source switching works
- Project metadata can be saved through the desktop UI
- Saved projects are listed in the UI
- A saved project context can be reopened from the list
- Reopening a saved project can now restore dashboard composition and rerun the saved semantic query
- The current project can be exported as a JSON snapshot file
- The current project can now be re-imported from a JSON snapshot file when the referenced local data files still exist
- A project can now persist and reopen multiple named dashboard views, and older single-view projects still restore through the legacy compatibility path
- Saved dashboard views can now reorder the chart/query/table sections and persist section width changes through project save and reopen
- Query results can now be inspected in the workspace through a sortable, pageable preview table before switching into the dashboard
- Recent export jobs can now be inspected and cancelled from a persistent workspace activity panel instead of only through a transient status banner
- Browser-driven regression coverage now exercises export-job completion, export-job cancellation, and JSON snapshot import roundtrip flows
- The repository now has explicit cached-query performance regression coverage with 1M-row evidence, explicit frontend and Rust lint entrypoints plus CI lint gates, and an accepted ADR exception for the former shadcn/Radix mismatch
- The repository validation helper now uses a dedicated low-artifact Rust target cache on Windows to reduce avoidable disk and PDB pressure during local checks
- The desktop backend now exposes a first-class tracked cache-warmup workflow, and the workbench can launch it through a `Warm Cache` action that surfaces lifecycle and cancellation through the existing recent-jobs panel
- The telemetry crate now supports local in-memory command metrics sampling, runtime telemetry snapshots, and explicit debug logging control through environment variables and Tauri commands
- The previously tracked strict AGENT.md gap-closure backlog is complete, but a new re-audit has reopened architecture-parity work for cached Parquet engine selection and profiling-job coverage
- The repository now provides a dedicated Windows/MSVC desktop light-validation path so routine local backend checks do not have to default to the heavier `cargo test -p desktop --lib` flow
- The current query result can be exported as CSV through the desktop UI
- The current query result can be exported as XLSX and PDF through the desktop UI
- Query-result export jobs can be cancelled while the frontend polls tracked backend job state
- Projects can persist multiple saved dashboard views at a time
- Semantic queries can be executed in the Rust backend against CSV data sources
- The desktop frontend can configure and execute a semantic query with dimensions, measures, and filters
- The desktop frontend now has reusable shell and panel layout primitives
- The desktop frontend can render basic bar and line charts from query results
- The desktop frontend can view analysis results on a dedicated dashboard
- The Rust backend exposes structured errors with stable codes and readable messages
- The desktop frontend surfaces structured backend failures as readable action-specific error banners
- The Rust backend emits structured JSON logs for key command lifecycle events
- The desktop frontend emits structured JSON logs for key user interactions and maintains a recent in-memory log buffer
- The Rust backend crates now have broader direct unit coverage for parsing, validation, and storage edge cases
- The desktop frontend has automated Playwright coverage for the main browser-exercised workflows
- The desktop frontend uses React Query and Zustand as the baseline state-management layer
- The desktop frontend uses Tailwind plus shared shadcn-style primitives as the baseline UI layer
- The desktop frontend consumes reusable UI and chart code from `packages/ui-kit` and `packages/chart-presets`
- The desktop frontend no longer ships ECharts in the main application bundle
- The repository shape now matches the intended top-level AGENT.md scaffold much more closely
- The Rust workspace now uses a DuckDB-only cached-Parquet execution and profiling path in `analytics-core`
- The Rust workspace now includes an active `connectors` crate for CSV loading and Parquet cache generation
- The Rust workspace now includes an active `export-runtime` crate for JSON snapshot export
- The Rust workspace now includes active `job-runner` and `telemetry` crates for command timing and backend log emission
- The desktop frontend is now organized around active page, feature, shared, and entity modules instead of a root-level component bundle
- The backend can materialize Parquet cache files for imported CSV data sources
- The backend can execute semantic queries against cached Parquet data through DuckDB
- The repository now includes reusable developer, data, and packaging helper scripts under `scripts/`
- The workbench now renders active `field-pane` and `filter-bar` feature modules for query field configuration and filter editing
- The page layer now renders active workspace and dashboard widget assemblies from `apps/desktop/src/widgets`
- The workbench now supports dragging fields into query dimension and measure slots through `apps/desktop/src/shared/dnd`
- The workbench and dashboard now consume active `field`, `chart`, and `dashboard` entity models from `apps/desktop/src/entities`
- The backend now exposes reusable schema-driven query suggestions through `crates/analytics-core/src/suggestions`
- The backend now exposes reusable chart-spec generation through `crates/analytics-core/src/chart_specs`
- The workbench can now apply a backend-generated recommendation and chart hint through the desktop command boundary
- The dashboard chart renderer now prefers backend chart specs for field/series mapping
- The recommendation apply flow and the dashboard render flow now reuse one shared chart-spec state lifecycle
- The browser E2E suite now covers the backend recommendation apply flow and backend chart-spec dashboard path
- The desktop crate now has direct Rust-side command coverage for recommendation and chart-spec generation paths
- The frontend bootstrap and top-level provider ownership now live under `apps/desktop/src/app`
- The dataset import workflow now lives in `apps/desktop/src/features/dataset-import` instead of being embedded in the page/workspace composition layer
- The workbench page now consumes extracted shared/entity helpers for UI error mapping and query/project derivation concerns
- The workbench route now renders through `apps/desktop/src/widgets/page/WorkbenchRuntimeWidget.tsx`, which binds `useWorkbenchRuntime.ts` to the shell/widget page assemblies
- The workbench runtime now consumes reusable API helpers from `apps/desktop/src/shared/api/workbenchApi.ts`
- The workbench runtime now consumes reusable query hooks from `apps/desktop/src/shared/api/workbenchQueries.ts`
- The workbench runtime now consumes reusable command actions from `apps/desktop/src/shared/api/workbenchActions.ts`
- The workbench runtime now keeps a first-class dashboard-view collection and active dashboard view selection alongside the current live query state
- The workspace now exposes save-and-open controls for named dashboard views without removing the existing project save/open/export flows
- The dashboard surface now exposes first-party layout editing controls instead of remaining fixed to one chart/query/table arrangement
- The workspace now exposes a first-party result preview table instead of requiring dashboard mode for result inspection
- The workspace now exposes a first-party job activity panel instead of surfacing tracked jobs only through a single export status banner and button
- The workspace now exposes first-party `Warm Cache` and `Profile Data` actions for the active data source, and both workflows run through tracked backend jobs instead of leaving job-runner limited to import/export only
- The backend now exposes `get_telemetry_snapshot`, `get_telemetry_settings`, and `set_telemetry_debug_logging` so local command metrics and debug telemetry controls are reachable through the reviewed desktop boundary
- The developer scripts now include `scripts/dev/run-desktop-light-validation.ps1`, which validates `telemetry`, `job-runner`, and `check -p desktop --lib` through the shared MSVC wrapper instead of forcing routine local work onto the full Tauri test target
- The desktop browser validation wrapper now runs from `apps/desktop`, and the root Playwright suite helper waits for stable workspace/dashboard state before asserting, which removed the flaky browser regression failures seen during this handoff round
- The desktop crate now exposes a no-runtime support-layer validation path through `test -p desktop --lib --no-default-features`, and `scripts/dev/run-desktop-light-validation.ps1` now completes reliably on Windows/MSVC without depending on a cold Tauri runtime compile
- A follow-up stability sweep reran frontend lint, desktop browser validation, and the desktop light-validation path successfully after one more `showWorkspace()` helper hardening pass in the root Playwright suite
- The shared Windows Rust wrapper now clears oversized `validation-*` target caches under low-disk conditions and retries once after a failed low-space run, which recovered the desktop light-validation path after the validation cache had expanded enough to exhaust `E:` space

## Next Goal

No active implementation task is currently in progress.
