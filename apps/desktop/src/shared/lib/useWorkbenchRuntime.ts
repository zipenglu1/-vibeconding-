import { useQueryClient } from "@tanstack/react-query";
import type { AnalysisDashboardProps } from "../../features/dashboard-editor/ui/AnalysisDashboard";
import type { QueryWorkspaceProps } from "../../features/chart-builder/ui/QueryWorkspace";
import { buildProjectMetadata } from "../../entities/dataset/projectMetadata";
import { numericColumns } from "../../entities/field/queryBuilder";
import { createWorkbenchActions } from "../api/workbenchActions";
import {
  useQueryRecommendationsQuery,
  useSavedProjectsQuery,
} from "../api/workbenchQueries";
import {
  buildDashboardProps,
  buildWorkbenchHero,
  buildWorkspaceProps,
  type WorkbenchHeroState,
} from "./workbenchViewProps";
import { createWorkbenchInteractions } from "./workbenchInteractions";
import { resolveWorkbenchStatus } from "./workbenchStatus";
import { useWorkbenchEffects } from "./useWorkbenchEffects";
import {
  useActiveDataSource,
  useWorkbenchDerivedModels,
} from "./useWorkbenchModels";
import { useWorkbenchState } from "./useWorkbenchState";

export interface WorkbenchRuntimeResult {
  hero: WorkbenchHeroState;
  workspaceProps: QueryWorkspaceProps;
  dashboardProps: AnalysisDashboardProps;
  showWorkspace: () => void;
  showDashboard: () => void;
}

export function useWorkbenchRuntime(): WorkbenchRuntimeResult {
  const queryClient = useQueryClient();
  const {
    projectId,
    setProjectId,
    path,
    setPath,
    projectName,
    setProjectName,
    dataSources,
    setDataSources,
    error,
    setError,
    status,
    setStatus,
    isLoading,
    setIsLoading,
    isPickingFile,
    setIsPickingFile,
    isPersisting,
    setIsPersisting,
    isExporting,
    setIsExporting,
    activeExportJobId,
    setActiveExportJobId,
    isRunningQuery,
    setIsRunningQuery,
    isHydratingProject,
    setIsHydratingProject,
    queryResult,
    setQueryResult,
    profileResult,
    setProfileResult,
    queryBuilder,
    setQueryBuilder,
    dashboardViews,
    setDashboardViews,
    activeDashboardViewId,
    setActiveDashboardViewId,
    recentJobs,
    setRecentJobs,
    activeDataSourceId,
    chartVariant,
    chartSpec,
    viewMode,
    language,
    dashboardLayout,
    setActiveDataSourceId,
    setChartVariant,
    setChartSpec,
    setViewMode,
    setDashboardLayout,
  } = useWorkbenchState();

  const savedProjectsQuery = useSavedProjectsQuery();
  const savedProjects = savedProjectsQuery.data ?? [];

  const activeDataSource = useActiveDataSource({
    dataSources,
    activeDataSourceId,
  });
  const recommendationsQuery = useQueryRecommendationsQuery(activeDataSource);
  const { builtQuery, dashboardModel, primaryRecommendation } =
    useWorkbenchDerivedModels({
      activeDataSource,
      queryBuilder,
      queryResult,
      chartSpec,
      dashboardLayout,
      recommendations: recommendationsQuery.data,
    });

  useWorkbenchEffects({
    savedProjects: savedProjectsQuery.data,
    savedProjectsError: savedProjectsQuery.error,
    activeDataSource,
    isHydratingProject,
    viewMode,
    queryResult,
    recommendationsError: recommendationsQuery.error,
    setError,
    setQueryBuilder,
    setQueryResult,
    setProfileResult,
    setChartSpec,
    setViewMode,
    setActiveDashboardViewId,
    setDashboardLayout,
  });

  const {
    loadDataSource,
    handlePickFile,
    handleSaveProject,
    handleImportProject,
    handleSaveDashboardView,
    handleExportProject,
    handleWarmDataSourceCache,
    handleProfileDataSource,
    handleExportQueryResult,
    handleExportQueryResultXlsx,
    handleExportQueryResultPdf,
    handleCancelExport,
    handleCancelJob,
    handleOpenProject,
    handleOpenDashboardView,
    handleRunQuery,
    autoBuildChart,
    applyRecommendation,
  } = createWorkbenchActions({
    queryClient,
    projectId,
    projectName,
    activeDataSource,
    dataSources,
    dashboardViews,
    recentJobs,
    queryBuilder,
    chartSpec,
    builtQuery,
    queryResult,
    activeExportJobId,
    chartVariant,
    viewMode,
    language,
    dashboardLayout,
    setProjectId,
    setPath,
    setProjectName,
    setDataSources,
    setDashboardViews,
    setRecentJobs,
    setError,
    setStatus,
    setIsLoading,
    setIsPickingFile,
    setIsPersisting,
    setIsExporting,
    setActiveExportJobId,
    setIsRunningQuery,
    setIsHydratingProject,
    setQueryResult,
    setProfileResult,
    setQueryBuilder,
    setActiveDashboardViewId,
    setChartVariant,
    setChartSpec,
    setViewMode,
    setDashboardLayout,
    setActiveDataSourceId,
    buildProjectMetadata: () =>
      buildProjectMetadata(
        projectName,
        projectId,
        activeDataSourceId,
        dataSources,
        dashboardViews,
        activeDashboardViewId,
        queryBuilder,
        chartSpec,
        chartVariant,
        viewMode,
        dashboardLayout,
      ),
  });

  const {
    activateDataSource,
    updateQueryBuilder,
    changeChartVariant,
    showWorkspace,
    showDashboard,
    moveLayoutSection,
    toggleLayoutSectionSize,
  } = createWorkbenchInteractions({
    chartSpec,
    setActiveDataSourceId,
    setPath,
    setError,
    setQueryBuilder,
    setChartVariant,
    setChartSpec,
    setViewMode,
    dashboardLayout,
    setDashboardLayout,
  });

  const hero = buildWorkbenchHero({
    viewMode,
    error,
    status: resolveWorkbenchStatus(status, language),
    hasQueryResult: Boolean(queryResult),
  });

  const workspaceProps = buildWorkspaceProps({
    projectId,
    path,
    projectName,
    activeDataSource,
    savedProjects,
    dashboardViews,
    activeDashboardViewId,
    recentJobs,
    dataSources,
    error,
    status: resolveWorkbenchStatus(status, language),
    isLoading,
    isPickingFile,
    isPersisting,
    isExporting,
    activeExportJobId,
    isRunningQuery,
    isLoadingRecommendation: recommendationsQuery.isLoading,
    queryResult,
    profileResult,
    queryBuilder,
    chartSpec,
    chartVariant,
    builtQuery,
    recommendation: primaryRecommendation,
    numericColumns: numericColumns(activeDataSource),
    onProjectNameChange: setProjectName,
    onPathChange: setPath,
    onPickFile: () => void handlePickFile(),
    onLoadDataSource: () => void loadDataSource(path),
    onSaveProject: () => void handleSaveProject(),
    onImportProject: () => void handleImportProject(),
    onSaveDashboardView: () => void handleSaveDashboardView(),
    onRestoreProject: () => void handleOpenProject(projectId),
    onExportProject: () => void handleExportProject(),
    onWarmDataSourceCache: () => void handleWarmDataSourceCache(),
    onProfileDataSource: () => void handleProfileDataSource(),
    onExportQueryResult: () => void handleExportQueryResult(),
    onExportQueryResultXlsx: () => void handleExportQueryResultXlsx(),
    onExportQueryResultPdf: () => void handleExportQueryResultPdf(),
    onCancelExport: () => void handleCancelExport(),
    onCancelJob: (jobId) => void handleCancelJob(jobId),
    onRunQuery: () => void handleRunQuery(),
    onOpenProject: (nextProjectId) => void handleOpenProject(nextProjectId),
    onOpenDashboardView: (dashboardViewId) =>
      void handleOpenDashboardView(dashboardViewId),
    onActivateDataSource: activateDataSource,
    onApplyRecommendation: () => applyRecommendation(primaryRecommendation),
    onChartVariantChange: changeChartVariant,
    onAssignChartCategoryField: (fieldName) =>
      void autoBuildChart({
        dimensionField: fieldName,
        dimensionAlias: fieldName,
      }),
    onAssignChartValueField: (fieldName) =>
      void autoBuildChart({
        measureField: fieldName,
        measureAlias: `${queryBuilder.measureAggregation}_${fieldName}`,
      }),
    onUpdateQueryBuilder: updateQueryBuilder,
  });

  const dashboardProps = buildDashboardProps({
    dashboard: dashboardModel,
    chartVariant,
    onChartVariantChange: changeChartVariant,
    onMoveSection: moveLayoutSection,
    onToggleSectionSize: toggleLayoutSectionSize,
  });

  return {
    hero,
    workspaceProps,
    dashboardProps,
    showWorkspace,
    showDashboard,
  };
}
