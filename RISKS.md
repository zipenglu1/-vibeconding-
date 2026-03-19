# RISKS.md - Project Risks

## Active Risks

### RISK-001: DuckDB and Polars dependency conflict
- Severity: medium
- Status: reduced
- Impact: the dependency path now builds successfully, but the product still uses the older CSV-only execution flow until Parquet ingestion and DuckDB-backed execution are implemented.
- Mitigation: use the restored stack immediately in the next ingestion and query-routing tasks instead of leaving it as an unused dependency.

### RISK-005: Windows-specific DuckDB link requirements
- Severity: medium
- Status: active
- Impact: DuckDB on Windows requires linking `Rstrtmgr`, and future crate moves or backend split work could accidentally drop that configuration and break builds again.
- Mitigation: keep the Windows link configuration explicit in `crates/analytics-core/build.rs` until the analytics stack is moved into its final module boundaries.

### RISK-006: Full desktop dev-profile build is unstable with DuckDB on current Windows/MSVC toolchain
- Severity: high
- Status: active
- Impact: targeted backend tests pass, but `cargo build` for the full workspace currently fails intermittently while rebuilding `libduckdb-sys` for the desktop target in this environment, which can slow or block end-to-end validation.
- Mitigation: keep task work validated with targeted crate tests plus the lighter `scripts/dev/run-desktop-light-validation.ps1` path for routine desktop backend changes, and prioritize isolating the desktop-side DuckDB rebuild issue before expanding more backend changes that require repeated full-workspace Rust builds.

### RISK-007: Parquet query planner is intentionally narrow
- Severity: medium
- Status: active
- Impact: the new DuckDB query path only covers the current semantic-query surface and relies on a custom planner, so future query features will need explicit planner updates instead of automatically working.
- Mitigation: keep the planner constrained to validated field names and supported operators, add targeted unit coverage when expanding query capabilities, and move source/query concerns toward the final crate boundaries in the next alignment tasks.

### RISK-008: AGENT.md and live cache-query architecture have drifted apart again
- Severity: high
- Status: resolved on 2026-03-17
- Impact: the live `analytics-core` executor had drifted onto a Polars DataFrame path for cached Parquet queries, which no longer matched the documented DuckDB cache-query architecture.
- Mitigation: completed `TASK-10.1.2` by restoring a DuckDB-backed production executor, then completed `TASK-10.2.1` by removing the remaining Polars fallback entirely and adding the missing profiling-job workflow on the same DuckDB-backed cached-Parquet path.

### RISK-009: The restored DuckDB path still relies on a constrained SQL renderer
- Severity: medium
- Status: active
- Impact: the current `duckdb` crate still does not expose a higher-level relation API for this query surface, so production execution now depends on a centralized `duckdb_sql` AST renderer. If that single renderer expands casually later, the repository could drift back toward the ad hoc SQL-construction problem that was just removed from `executor` and `profiling`.
- Mitigation: keep all DuckDB text generation inside `crates/analytics-core/src/duckdb_sql.rs`, preserve regression coverage around filters, grouping, sorting, pagination, and profiling queries, and avoid broadening the supported SQL surface without a fresh review.

### RISK-011: Root E2E scaffold and live Playwright suite are still split
- Severity: low
- Status: resolved on 2026-03-17
- Impact: the active desktop browser suite previously lived under `apps/desktop/e2e` while the root `tests/e2e` directory documented in `AGENT.md` was still only a placeholder, creating avoidable confusion about the canonical E2E location.
- Mitigation: completed `TASK-12.1.1` by moving the live suite to `tests/e2e/desktop.app.spec.ts` and keeping the desktop Playwright config pointed at that root directory.

### RISK-010: Profiling workflow coverage still lags behind the other tracked jobs
- Severity: medium
- Status: resolved on 2026-03-17
- Impact: profiling previously existed as a tracked backend and UI workflow, but the automated validation matrix gave stronger regression protection to import/export and cache-warmup paths than to profiling.
- Mitigation: completed `TASK-11.2.1` by adding a dedicated Playwright profiling roundtrip in `apps/desktop/e2e/app.spec.ts` and rerunning the full desktop E2E suite.

### RISK-002: Frontend architecture is still temporary
- Severity: medium
- Status: open
- Impact: the app now has workspace and dashboard modes, but the frontend is still not organized into the target long-term feature structure from `AGENT.md`.
- Mitigation: keep using the new layout primitives and component extraction approach so future frontend restructuring can proceed incrementally instead of through a single large rewrite.

### RISK-004: Frontend bundle size increased after charting
- Severity: medium
- Status: reduced
- Impact: the first ECharts integration pushes the main frontend bundle above Vite's default warning threshold, which may make later dashboard growth expensive if left unchecked.
- Mitigation: the chart renderer now uses selective `echarts/core` imports, and the build now encodes an explicit 550 kB warning threshold for the reviewed lazy chart bundle size so future growth still surfaces as a meaningful regression.
- Evidence: the latest validated frontend build reports `dist/assets/charts-BtRpCZUW.js` at 521.44 kB after minification, down from 1,060.77 kB, and the updated Vite threshold accepts that reviewed size without warning noise.

## Resolved Or Reduced Risks

### RISK-R4: Desktop browser validation depended on ad hoc manual command knowledge
- Status: resolved on 2026-03-17
- Evidence: `scripts/dev/run-desktop-browser-validation.ps1` now typechecks the desktop frontend, runs the Playwright suite with reviewed defaults, and cleans transient Playwright outputs; the same path is exposed as `pnpm validate:desktop-browser`.
- Outcome: the repository now has one stable browser-validation entrypoint instead of relying on contributors to remember the exact multi-command sequence and cleanup steps manually.

### RISK-R3: Strict AGENT.md compliance gaps could create false completion signals
- Status: resolved on 2026-03-17
- Evidence: `EPIC-8` is now fully marked done, including direct SQL removal, Radix-backed live UI primitives, tracked cache-warmup jobs, and telemetry metrics/debug controls.
- Outcome: the repository no longer carries an open strict-gap closure item in the tracked backlog.

### RISK-R2: Metadata persistence is still missing
- Status: resolved on 2026-03-15
- Evidence: project metadata save, restore, listing, and export flows are implemented.
- Outcome: project state can now be persisted and reused instead of being session-only.

### RISK-R1: No network access for CSV dependency download
- Status: resolved on 2026-03-15
- Evidence: `cargo test -p analytics-core` successfully downloaded and built `csv` from `crates.io`.
- Outcome: future backend work can use well-supported Rust crates when they are appropriate.
