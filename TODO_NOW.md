# TODO_NOW.md - Current Single Task

## Current Single Task

No active implementation task is currently in progress.

## Latest Note

- The desktop workbench now supports a persisted English/Chinese language selector from the home hero area because there is still no dedicated settings page.
- This round localized the main hero, dataset import panels, query workspace controls, dashboard surface, result table, and key frontend status messages through `apps/desktop/src/shared/lib/i18n.ts`.
- Verified this round:
- `pnpm lint:frontend`
- `pnpm -C apps/desktop exec tsc --noEmit`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-browser-validation.ps1`
- Another post-task stability sweep is now complete. `scripts/dev/invoke-rust-command.ps1` now treats oversized `validation-*` target directories as disposable recovery caches under low-disk conditions, clearing them before or after a failed low-space run when needed.
- Evidence from this round: with `E:` reduced to `0` free bytes, `check -p analytics-core --tests` exposed the low-disk failure mode (`os error 112`), the shared wrapper recovered usable space in `target/validation-msvc-check`, and `scripts/dev/run-desktop-light-validation.ps1` completed successfully again once the cache policy was corrected.
- A post-task stability sweep is now complete. The root Playwright helper `showWorkspace()` in `tests/e2e/desktop.app.spec.ts` was hardened again to tolerate delayed hero-area rerenders during snapshot import and other dashboard-to-workspace transitions.
- `TASK-13.1.2` is now complete: `scripts/dev/run-desktop-light-validation.ps1` no longer depends on a cold `check -p desktop --lib` run.
- The desktop crate now gates Tauri runtime code behind the `desktop-runtime` feature, skips `tauri-build` when that feature is disabled, and exposes a lightweight `test -p desktop --lib --no-default-features` support-layer validation path for routine Windows/MSVC checks.
- This round also rehardened the shared Playwright `showWorkspace()` helper so the reviewed browser-validation wrapper remains stable across hero-area rerenders.
- Verified this round:
- `pnpm lint:frontend`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-browser-validation.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p telemetry" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p job-runner" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-light-validation.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "check -p desktop --lib" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`
