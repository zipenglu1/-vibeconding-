import { AppShell } from "@bi/ui-kit";
import { useEffect, useLayoutEffect, useState } from "react";
import type { AnalysisDashboardProps } from "../../features/dashboard-editor/ui/AnalysisDashboard";
import type { QueryWorkspaceProps } from "../../features/chart-builder/ui/QueryWorkspace";
import { useAppUiStore } from "../../shared/lib/appUiStore";
import type { WorkbenchHeroState } from "../../shared/lib/workbenchViewProps";
import WorkbenchBodyWidget from "../body/WorkbenchBodyWidget";
import WorkbenchHeroWidget from "../hero/WorkbenchHeroWidget";
import ImportPreparationWidget from "../import/ImportPreparationWidget";

export interface WorkbenchShellWidgetProps {
  hero: WorkbenchHeroState;
  workspaceProps: QueryWorkspaceProps;
  dashboardProps: AnalysisDashboardProps;
  onShowWorkspace: () => void;
  onShowDashboard: () => void;
}

function WorkbenchShellWidget({
  hero,
  workspaceProps,
  dashboardProps,
  onShowWorkspace,
  onShowDashboard,
}: WorkbenchShellWidgetProps) {
  const language = useAppUiStore((state) => state.language);
  const [surfacePage, setSurfacePage] = useState<"import" | "studio">("import");

  const surfaceCopy =
    language === "zh"
      ? {
          railLabel: "导航",
          importLabel: "导入",
          studioLabel: "工作区",
          importHint: "数据导入",
          studioHint: "查询分析",
        }
      : {
          railLabel: "Navigation",
          importLabel: "Import",
          studioLabel: "Studio",
          importHint: "Data import",
          studioHint: "Query analysis",
        };

  useEffect(() => {
    if (hero.viewMode === "dashboard") {
      setSurfacePage("studio");
    }
  }, [hero.viewMode]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [hero.viewMode, surfacePage]);

  function handleShowWorkspace() {
    setSurfacePage("studio");
    onShowWorkspace();
  }

  function handleShowDashboard() {
    setSurfacePage("studio");
    onShowDashboard();
  }

  return (
    <div className="workbench-surface-shell">
      <aside className="surface-page-rail" aria-label={surfaceCopy.railLabel}>
        <div className="surface-page-rail-badge">DB</div>
        <button
          type="button"
          className={`surface-page-link${surfacePage === "import" ? " active" : ""}`}
          onClick={() => setSurfacePage("import")}
          title={surfaceCopy.importHint}
        >
          <span className="surface-page-link-index">I</span>
          <span className="surface-page-link-copy">
            <strong>{surfaceCopy.importLabel}</strong>
            <small>{surfaceCopy.importHint}</small>
          </span>
        </button>
        <button
          type="button"
          className={`surface-page-link${surfacePage === "studio" ? " active" : ""}`}
          onClick={() => setSurfacePage("studio")}
          title={surfaceCopy.studioHint}
        >
          <span className="surface-page-link-index">S</span>
          <span className="surface-page-link-copy">
            <strong>{surfaceCopy.studioLabel}</strong>
            <small>{surfaceCopy.studioHint}</small>
          </span>
        </button>
      </aside>

      {surfacePage === "import" ? (
        <AppShell>
          <ImportPreparationWidget {...workspaceProps} />
        </AppShell>
      ) : (
        <AppShell
          hero={
            <WorkbenchHeroWidget
              hero={hero}
              onShowWorkspace={handleShowWorkspace}
              onShowDashboard={handleShowDashboard}
            />
          }
        >
          <WorkbenchBodyWidget
            hero={hero}
            workspaceProps={workspaceProps}
            dashboardProps={dashboardProps}
          />
        </AppShell>
      )}
    </div>
  );
}

export default WorkbenchShellWidget;
