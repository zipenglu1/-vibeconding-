# Packaging Scripts

`build-desktop.ps1` wraps the current desktop build entrypoints.

Recommended local usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\packaging\build-desktop.ps1 -FrontendOnly
```

Full package build:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\packaging\build-desktop.ps1
```

On Windows, the script now forces `RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-msvc` before invoking `pnpm --filter desktop tauri build`. This avoids the GNU-toolchain path that breaks the bundled DuckDB/Tauri build on this repository.

If you need to run the Tauri packaging command directly instead of using the wrapper, keep the same environment:

```powershell
$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"
$env:CARGO_TARGET_DIR = "E:\Claudeproject\20260314\target\validation-msvc-package"
pnpm --filter desktop tauri build
```

The `-FrontendOnly` mode is the default root-package entrypoint because the full desktop Rust bundle still depends on the known Windows DuckDB build instability tracked in `RISKS.md`.
