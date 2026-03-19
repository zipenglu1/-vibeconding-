import type { AnalysisDashboardProps } from "../../features/dashboard-editor/ui/AnalysisDashboard";
import type { QueryWorkspaceProps } from "../../features/chart-builder/ui/QueryWorkspace";
import type { ViewMode } from "./appUiStore";
import type { UiErrorState } from "./uiError";

export interface WorkbenchHeroState {
  viewMode: ViewMode;
  error: UiErrorState | null;
  status: string;
  hasQueryResult: boolean;
}

type BuildWorkbenchHeroOptions = WorkbenchHeroState;

export function buildWorkbenchHero({
  viewMode,
  error,
  status,
  hasQueryResult,
}: BuildWorkbenchHeroOptions): WorkbenchHeroState {
  return {
    viewMode,
    error,
    status,
    hasQueryResult,
  };
}

interface BuildDashboardPropsOptions {
  dashboard: AnalysisDashboardProps["dashboard"];
  chartVariant: AnalysisDashboardProps["chartVariant"];
  onChartVariantChange: AnalysisDashboardProps["onChartVariantChange"];
  onMoveSection: AnalysisDashboardProps["onMoveSection"];
  onToggleSectionSize: AnalysisDashboardProps["onToggleSectionSize"];
}

export function buildDashboardProps({
  dashboard,
  chartVariant,
  onChartVariantChange,
  onMoveSection,
  onToggleSectionSize,
}: BuildDashboardPropsOptions): AnalysisDashboardProps {
  return {
    dashboard,
    chartVariant,
    onChartVariantChange,
    onMoveSection,
    onToggleSectionSize,
  };
}

export function buildWorkspaceProps(
  props: QueryWorkspaceProps,
): QueryWorkspaceProps {
  return props;
}
