# Widgets

Active widget layer for page-level frontend assemblies.

- `page/WorkbenchRuntimeWidget.tsx` binds the workbench runtime hook to the shell widget for the active route.
- `shell/WorkbenchShellWidget.tsx` composes the page-level shell by stitching the hero and body widgets into `AppShell`.
- `hero/WorkbenchHeroWidget.tsx` composes the page hero copy, mode-switch controls, and status/error banners.
- `body/WorkbenchBodyWidget.tsx` composes the page-level switch between workspace and dashboard widget assemblies.
- `workspace/AnalysisWorkspaceWidget.tsx` composes the main analysis workspace surface.
- `dashboard/AnalysisDashboardWidget.tsx` composes the dashboard surface.

The current layering is:

- `pages/WorkbenchPage.tsx` is a thin route wrapper.
- `page/WorkbenchRuntimeWidget.tsx` owns runtime binding.
- `shell/WorkbenchShellWidget.tsx` owns `AppShell` composition.
- `hero/` and `body/` widgets own the top-level page sections.
- `workspace/` and `dashboard/` widgets bridge into the feature-level surfaces.
