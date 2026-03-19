# Dev Scripts

`validate-workspace.ps1` runs the current stable repository validation flow:

- Typecheck `packages/ts-contracts`
- Typecheck `apps/desktop`
- Run lighter MSVC-backed `cargo check` validation for `analytics-core`, `connectors`, and `desktop`
- Check the `integration-tests` targets without forcing a local Windows link step
- On Windows, route those Rust checks through `stable-x86_64-pc-windows-msvc`
- Isolate those Rust checks under `target/validation-msvc-check` with incremental compilation disabled and debug info stripped, and reset that cache automatically if it grows past 6 GB

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\validate-workspace.ps1
```

This intentionally keeps the local Windows path on `cargo check` for the heavier Rust crates so repository validation stays executable even when the environment is constrained by linker disk-space or PDB limits.

`invoke-rust-command.ps1` is the shared Rust wrapper used by Windows validation scripts. It automatically selects `stable-x86_64-pc-windows-msvc` unless `OFFLINE_BI_RUST_TOOLCHAIN` overrides it.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p desktop --no-run"
```

Optional flags:

- `-TargetDir <path>` to isolate artifacts from the default Cargo `target` directory
- `-DisableIncremental` to reduce validation cache growth
- `-NoDebuginfo` to add `-C debuginfo=0` for lower artifact pressure on validation-only runs
- `-MinimumFreeSpaceGb <int>` to control when low-disk protection starts considering a validation cache reset
- `-MinimumResetTargetSizeGb <int>` to control how large a `validation-*` cache must be before the wrapper clears it proactively

When `-TargetDir` points at a `validation-*` cache and the drive is low on space, the wrapper now clears oversized validation caches before running Cargo and retries once after a failure under the same low-disk conditions. This reduces repeated `os error 112` failures caused by stale validation artifacts.

`run-cached-query-perf.ps1` runs the explicit cached Parquet query performance guard used by `TASK-7.3.1`.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-cached-query-perf.ps1
```

Optional parameters:

- `-RowCount` defaults to `1000000`
- `-CacheThresholdMs` defaults to `120000`
- `-QueryThresholdMs` defaults to `15000`

Telemetry validation:

- `powershell -ExecutionPolicy Bypass -File .\scripts\dev\invoke-rust-command.ps1 "test -p telemetry" -TargetDir .\target\validation-msvc-check -DisableIncremental -NoDebuginfo`

Optional telemetry environment variables:

- `OFFLINE_BI_TELEMETRY_METRICS=true|false` to enable or disable in-memory command metrics sampling
- `OFFLINE_BI_TELEMETRY_DEBUG=true|false` to emit extra telemetry metric-sample logs for local debugging

`run-desktop-light-validation.ps1` is the cheaper desktop backend validation path for Windows/MSVC.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-light-validation.ps1
```

It runs:

- `test -p telemetry`
- `test -p job-runner`
- `test -p desktop --lib --no-default-features`

Use this for routine local validation when `cargo test -p desktop --lib` is too slow or times out because the Tauri desktop test target has to be fully linked. The last step validates the desktop package's pure support layer without enabling the Tauri runtime feature set.

`run-desktop-browser-validation.ps1` is the stable desktop frontend browser-validation path.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-browser-validation.ps1
```

It runs:

- `pnpm -C apps/desktop exec tsc --noEmit`
- `pnpm -C apps/desktop exec playwright test --timeout 60000 --workers 1`

By default it cleans `apps/desktop/test-results` and `apps/desktop/playwright-report` before and after the run. Optional flags:

- `-TimeoutMs <int>` to override the Playwright timeout
- `-Workers <int>` to override the worker count
- `-KeepArtifacts` to preserve Playwright output directories for debugging

`run-desktop-appium-validation.ps1` is the stable packaged-desktop validation path for real-window regression through Appium + `NovaWindows`.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-appium-validation.ps1
```

It improves desktop automation stability by:

- Starting Appium 3 locally on `http://127.0.0.1:4725/wd/hub` if it is not already ready
- Ensuring the workspace-local `.appium-home` contains `appium-novawindows-driver`
- Creating a long-lived `NovaWindows` session with `newCommandTimeout = 3600`
- Normalizing the desktop window to a fixed size and position before each interaction
- Favoring direct-path dataset import over the system file picker for the main regression path
- Capturing deterministic screenshots under `output/manual-test/appium-validation`
- Resetting the viewport back to known anchors before each deep interaction instead of relying on accumulated scroll state
- Using named click targets instead of ad-hoc coordinates so deeper flows can be recalibrated in one place

The scripted flow covers:

- Homepage
- Language switch
- Dataset import
- Query execution
- Workspace/Dashboard switching

With `-IncludeDashboardViewFlow`, it also covers:

- Save Dashboard View
- Open saved Dashboard View

Optional flags:

- `-AppiumBaseUrl <url>` to target a different Appium endpoint
- `-DesktopExe <path>` to override the packaged desktop executable
- `-FixturePath <path>` to override the import fixture
- `-OutputDir <path>` to change artifact output
- `-IncludeDashboardViewFlow` to enable the deeper Dashboard-view save/open path
- `-KeepDesktopOpen` to preserve the app window after the run for debugging

Recommended commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-appium-validation.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev\run-desktop-appium-validation.ps1 -IncludeDashboardViewFlow
```

Stable automation process:

1. Start from the packaged desktop executable under `target\validation-msvc-package\release\desktop.exe`.
2. Let the script ensure `Appium 3` and `appium-novawindows-driver` are ready before creating the `NovaWindows` session.
3. Always normalize the app window to a fixed size and origin before sending any click or key input.
4. Prefer direct-path dataset import for the primary regression path. The system file picker remains useful for exploratory testing, but it is less deterministic under WebView automation.
5. Before each deep workflow transition, reset the page back to a known anchor using `PgUp`/`PgDn` rather than chaining from whatever scroll position the previous step happened to leave behind.
6. Capture a screenshot before and after each important action so failures can be diagnosed without rerunning immediately.
7. Treat the Dashboard-view flow as part of the stable path only after query execution has been visibly confirmed in the artifacts.

Known-good flow that the script now uses:

1. Cold-start the packaged desktop app.
2. Switch `English -> 中文` from the homepage language select.
3. Page down to the dataset import card.
4. Paste `tests\fixtures\generated\sample-sales.csv` into the local file path field and click `加载文件`.
5. Page down to the query builder until the action row containing `运行查询` is visible.
6. Click `运行查询` and wait for the query result table to render.
7. Page back to the top and verify the dashboard header or query status state in the captured artifact set.
8. Toggle `工作区 -> 仪表盘` from the top hero tabs to confirm view switching did not lose state.
9. For the extended flow, return to `工作区`, page down to the query builder action row, click `保存仪表盘视图`, then return to the top `仪表盘视图` list and open the saved chip.

Artifacts to inspect:

- `01-home-en.png`: cold-start homepage baseline
- `02-language-zh-after.png`: confirms language switch
- `04-import-after.png`: confirms 24-row dataset import
- `06-run-query-after.png`: confirms query result table rendered
- `07-dashboard-header.png`: confirms top-of-page state after query
- `10-save-dashboard-view-after-click.png`: confirms dashboard view save toast/status
- `11-dashboard-views-list.png`: confirms list entry was created
- `12-open-dashboard-view-after.png`: confirms opening the saved view returns to Dashboard

Failure triage:

- If `06-run-query-before.png` does not show the `运行查询` button, the query-builder anchor drifted. Recalibrate the query-builder paging step first.
- If `10-save-dashboard-view-after-click.png` does not show the success status but `09-save-dashboard-view-before.png` still lacks the save button row, recalibrate the save-dashboard anchor instead of changing the click coordinate first.
- If `11-dashboard-views-list.png` does not show the saved chip but `10-save-dashboard-view-after-click.png` shows a success message, investigate the application state or persistence path before changing automation.
- If clicks start landing on the wrong controls across many steps, verify the desktop window size and position have not changed; the script assumes a normalized `816x639` window placed near the top-left corner.

Recalibration guidance:

- Keep all click targets centralized in `run-desktop-appium-validation.ps1` under the `$coords` map.
- Adjust scroll anchors before adjusting click coordinates whenever possible; most drift comes from landing on the wrong viewport section, not from the button moving inside the section.
- Re-run with `-KeepDesktopOpen` when debugging so the final window state can be inspected manually.
