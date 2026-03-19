# Development Validation Runbook

## Purpose

This runbook documents the practical validation flow for the current repository state.

## Common Commands

### Frontend

```powershell
pnpm -C apps/desktop exec tsc --noEmit
pnpm -C apps/desktop build
```

### Lightweight Rust crates

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p job-runner"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p telemetry"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p export-runtime"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p metadata-store"
```

### Heavy analytics path

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p analytics-core --no-run"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p connectors --no-run"
```

### Desktop crate

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-light-validation.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --lib --no-default-features"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "check -p desktop --lib"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --no-run"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --lib"
```

## Recommended Validation Order On Windows/MSVC

When validating changes that touch the desktop backend or analytics dependency path, use the repository wrapper so Windows consistently routes through `stable-x86_64-pc-windows-msvc`:

1. Run lightweight crate tests first.
2. Warm the heavy analytics dependency chain with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p analytics-core --no-run"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p connectors --no-run"
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p metadata-store --no-run"
```

3. Then validate the desktop crate with the lighter default path:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-light-validation.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --no-run"
```

Only escalate to `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --lib"` when you explicitly need the desktop crate's own unit tests. On Windows/MSVC that command is materially heavier because it must link a Tauri test binary, while the lighter path keeps routine validation focused on reusable crate tests plus `check -p desktop --lib`.
Only escalate to `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --lib"` when you explicitly need the desktop crate's own unit tests. On Windows/MSVC that command is materially heavier because it must link a Tauri test binary, while the lighter path now keeps routine validation focused on reusable crate tests plus `test -p desktop --lib --no-default-features`, which validates the desktop package's pure support layer without compiling the Tauri runtime.

This order reduces the chance that desktop validation appears to hang while compiling DuckDB, Polars, and the Tauri test target from a cold cache.

For the repository-wide helper path, `scripts/dev/validate-workspace.ps1` intentionally uses lighter `cargo check` commands on Windows so local validation stays stable before you escalate to the heavier crate-specific `cargo test --no-run` commands above.

That helper now also routes those checks into `target/validation-msvc-check`, disables incremental compilation for that validation-only path, and applies `-C debuginfo=0`. If that dedicated cache grows past 6 GB, the script clears it before continuing. This keeps routine repository validation from reusing oversized local build artifacts left behind by unrelated desktop or test builds.

The shared `scripts/dev/invoke-rust-command.ps1` wrapper now adds a second layer of protection for validation targets under low-disk conditions. When a `validation-*` target directory has grown large enough and drive free space drops below the reviewed threshold, the wrapper clears that validation cache before the Cargo invocation, and it retries once after a failed low-space run by resetting the same cache again.

## Telemetry Controls

The repository now exposes two optional telemetry environment variables:

- `OFFLINE_BI_TELEMETRY_METRICS=true|false` enables or disables in-memory command metrics sampling.
- `OFFLINE_BI_TELEMETRY_DEBUG=true|false` enables extra telemetry metric-sample log entries for local debugging.

The desktop backend also exposes these Tauri commands for runtime inspection and control:

- `get_telemetry_snapshot`
- `get_telemetry_settings`
- `set_telemetry_debug_logging`

Use `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p telemetry" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo` after telemetry changes to validate the local metrics and debug-toggle behavior.

## Current Runtime Boundaries

Use these boundaries when making changes:

- Tauri commands stay in `apps/desktop/src-tauri/src/commands`
- application state stays in `apps/desktop/src-tauri/src/app_state`
- builder/setup logic stays in `apps/desktop/src-tauri/src/bootstrap`
- reusable backend helpers stay in `apps/desktop/src-tauri/src/services`
- path and permission-sensitive helpers stay in `apps/desktop/src-tauri/src/security`
- command failures should keep using `AppError`

## Handoff Rules

At the end of each task round, update these files when their state changed:

- `TASKS.json`
- `PROGRESS.md`
- `TODO_NOW.md`
- `DECISIONS.md` when a new architectural decision is introduced
- `RISKS.md` when a new active risk is discovered
