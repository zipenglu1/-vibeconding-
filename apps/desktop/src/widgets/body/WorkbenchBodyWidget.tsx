import type { AnalysisDashboardProps } from "../../features/dashboard-editor/ui/AnalysisDashboard";
import type { QueryWorkspaceProps } from "../../features/chart-builder/ui/QueryWorkspace";
import type { WorkbenchHeroState } from "../../shared/lib/workbenchViewProps";
import AnalysisDashboardWidget from "../dashboard/AnalysisDashboardWidget";
import AnalysisWorkspaceWidget from "../workspace/AnalysisWorkspaceWidget";

export interface WorkbenchBodyWidgetProps {
  hero: WorkbenchHeroState;
  workspaceProps: QueryWorkspaceProps;
  dashboardProps: AnalysisDashboardProps;
}

function WorkbenchBodyWidget({
  hero,
  workspaceProps,
  dashboardProps,
}: WorkbenchBodyWidgetProps) {
  return hero.viewMode === "workspace" ? (
    <AnalysisWorkspaceWidget {...workspaceProps} />
  ) : (
    <AnalysisDashboardWidget {...dashboardProps} />
  );
}

export default WorkbenchBodyWidget;
