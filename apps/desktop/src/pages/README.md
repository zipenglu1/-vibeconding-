# Pages

This directory now owns route-level page composition for the desktop frontend.

`WorkbenchPage.tsx` is the active route wrapper for the current app flow.

The page no longer owns runtime orchestration or shell composition directly:

- `widgets/page/WorkbenchRuntimeWidget.tsx` binds `shared/lib/useWorkbenchRuntime.ts` to the page shell.
- `widgets/shell/WorkbenchShellWidget.tsx` stitches the hero and body widgets into `AppShell`.
- `widgets/hero/WorkbenchHeroWidget.tsx` owns the hero copy, view toggles, and status/error presentation.
- `widgets/body/WorkbenchBodyWidget.tsx` owns the workspace-versus-dashboard body switch.
