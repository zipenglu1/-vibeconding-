# Offline Desktop BI

Offline Desktop BI is a local-first desktop analytics workspace for importing tabular data, building semantic queries, and exporting analysis artifacts without requiring a network connection.

## Workspace Layout

- `apps/desktop`: Tauri 2 desktop app with the React 19 and Vite frontend plus the Rust desktop backend.
- `crates/analytics-core`: semantic query planning and cached Parquet execution.
- `crates/connectors`: CSV, Excel, Parquet, and SQLite snapshot loading plus cache materialization.
- `crates/export-runtime`: project snapshot and query-result export flows.
- `crates/job-runner`: tracked background job lifecycle and cancellation support.
- `crates/metadata-store`: SQLite-backed project metadata persistence.
- `crates/telemetry`: structured local logging, in-memory command metrics sampling, and debug telemetry controls.
- `packages/ui-kit`: shared frontend UI primitives.
- `packages/chart-presets`: shared chart renderer and presets.
- `packages/ts-contracts`: shared TypeScript command and domain contracts.
- `tests/integration`: Rust integration coverage across workspace crates.

## Prerequisites

- Node.js 20 or newer
- `pnpm`
- Rust stable toolchain
- On Windows, a working MSVC Rust toolchain for the Tauri desktop crate

## Install

```powershell
pnpm install
```

## Common Commands

```powershell
pnpm dev
pnpm build
pnpm lint
pnpm --filter desktop tauri dev
pnpm -C apps/desktop e2e
powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-cached-query-perf.ps1
```

## Validation

- Frontend typecheck: `pnpm -C apps/desktop exec tsc --noEmit`
- Frontend and Rust lint: `pnpm lint`
- Frontend E2E: `pnpm -C apps/desktop e2e`
- Desktop browser validation: `pnpm validate:desktop-browser`
- Workspace smoke validation: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1`
- Desktop light validation: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-light-validation.ps1`
- Desktop browser validation wrapper: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-browser-validation.ps1`
- Cached query performance guard: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-cached-query-perf.ps1`
- Telemetry crate validation: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p telemetry" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`
- Windows Rust command wrapper: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --no-run"`
- Desktop crate compile validation on Windows: `cargo +stable-x86_64-pc-windows-msvc test -p desktop --no-run`
- Connectors crate compile validation on Windows: `cargo +stable-x86_64-pc-windows-msvc test -p connectors --no-run`

## Sample Data And Packaging

- Generate a local CSV fixture: `powershell -ExecutionPolicy Bypass -File .\scripts\data\generate-sample-csv.ps1`
- Build frontend assets only: `powershell -ExecutionPolicy Bypass -File .\scripts\packaging\build-desktop.ps1 -FrontendOnly`
- Build the desktop bundle: `powershell -ExecutionPolicy Bypass -File .\scripts\packaging\build-desktop.ps1`

### Windows Packaging Notes

- On Windows, the desktop package must be built with `stable-x86_64-pc-windows-msvc`.
- `scripts\packaging\build-desktop.ps1` now enforces `RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-msvc` automatically when it runs on Windows, so it does not fall back to the GNU host toolchain.
- If you need to run the packaging step manually, use:

```powershell
$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"
$env:CARGO_TARGET_DIR = "E:\Claudeproject\20260314\target\validation-msvc-package"
pnpm --filter desktop tauri build
```

- Successful package outputs land under:
  - `target\validation-msvc-package\release\desktop.exe`
  - `target\validation-msvc-package\release\bundle\nsis\tauri-app_0.1.0_x64-setup.exe`
  - `target\validation-msvc-package\release\bundle\msi\tauri-app_0.1.0_x64_en-US.msi`

## Current Product Surface

- Import CSV, Excel, Parquet, and SQLite snapshot files
- Materialize cached Parquet artifacts for supported imports
- Execute semantic queries over cached data through the desktop backend
- Save and reopen projects with dashboard metadata
- Save multiple dashboard views and edit dashboard layout sections
- Preview query results in the workspace
- Export query results as CSV, XLSX, and PDF through tracked jobs
- Export and re-import project JSON snapshots
- Sample local command-duration metrics in `telemetry` and expose runtime telemetry snapshot plus debug-toggle commands from the desktop backend

## Notes

- The repository now exposes a root lint entrypoint through `pnpm lint`, while broader UI-stack hardening remains tracked separately in `TASKS.json`.
- On Windows, repository helper scripts now standardize Rust validation on `stable-x86_64-pc-windows-msvc` to avoid the GNU-side `%1 is not a valid Win32 application` build-script failure seen in this environment.
- `scripts/dev/validate-workspace.ps1` now isolates Rust validation artifacts under `target/validation-msvc-check`, disables incremental compilation there, and drops debug info for that path. If the validation cache grows past 6 GB, the script resets it before continuing so repeated local validation runs do not inherit avoidable target-directory bloat.
- `cargo test -p desktop --lib` remains materially heavier than the reviewed light desktop-support validation path on Windows/MSVC because it has to build and link the Tauri test target. For routine local backend validation, prefer `scripts/dev/run-desktop-light-validation.ps1`, which now runs the reusable crate tests plus `test -p desktop --lib --no-default-features` so the desktop package's pure support layer can be validated without compiling the Tauri runtime. Escalate to full `desktop` runtime checks only when you specifically need crate-local runtime validation.
- `scripts/dev/run-desktop-browser-validation.ps1` is the reviewed stable browser-validation path for the desktop frontend. It typechecks the desktop app, runs the Playwright suite with the current root `tests/e2e` wiring, and cleans `apps/desktop/test-results` plus `apps/desktop/playwright-report` by default.
- `scripts/dev/invoke-rust-command.ps1` now protects `target/validation-*` caches under low-disk conditions: when free space falls below the reviewed threshold and a validation cache has grown large enough, it clears that cache before retrying the Rust command. This keeps routine MSVC validation from getting stuck behind stale oversized artifacts when `os error 112` starts appearing.
- Optional telemetry overrides now live in `.env.example`: `OFFLINE_BI_TELEMETRY_METRICS=true|false` controls in-memory metrics sampling, and `OFFLINE_BI_TELEMETRY_DEBUG=true|false` enables extra telemetry metric-sample log entries. The desktop backend also exposes `get_telemetry_snapshot`, `get_telemetry_settings`, and `set_telemetry_debug_logging` for runtime inspection and debug toggling.
