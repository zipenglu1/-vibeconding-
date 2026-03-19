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
          railLabel: "页面",
          importLabel: "导入清洗",
          studioLabel: "分析工作台",
          importHint: "先准备数据",
          studioHint: "再做分析与仪表盘",
        }
      : {
          railLabel: "Pages",
          importLabel: "Import",
          studioLabel: "Studio",
          importHint: "Prepare data first",
          studioHint: "Then build analysis",
        };

  useEffect(() => {
    if (hero.viewMode === "dashboard") {
      setSurfacePage("studio");
    }
  }, [hero.viewMode]);

  useLayoutEffect(() => {
    // Dashboard sections can leave the document scrolled past the shorter
    // workspace content. Reset every known scroll root before paint.
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
      <aside
        className="surface-page-rail"
        aria-label={surfaceCopy.railLabel}
      >
        <div className="surface-page-rail-badge">01 / 02</div>
        <button
          type="button"
          className={`surface-page-link${surfacePage === "import" ? " active" : ""}`}
          onClick={() => setSurfacePage("import")}
        >
          <span className="surface-page-link-index">01</span>
          <span className="surface-page-link-copy">
            <strong>{surfaceCopy.importLabel}</strong>
            <small>{surfaceCopy.importHint}</small>
          </span>
        </button>
        <button
          type="button"
          className={`surface-page-link${surfacePage === "studio" ? " active" : ""}`}
          onClick={() => setSurfacePage("studio")}
        >
          <span className="surface-page-link-index">02</span>
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
