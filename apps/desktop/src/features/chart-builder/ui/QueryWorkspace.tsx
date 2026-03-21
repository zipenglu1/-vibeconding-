import { useEffect, useState, type ChangeEvent } from "react";
import type {
  ChartSpec,
  DataColumn,
  DataSourceProfile,
  LoadedDataSource,
  JobSnapshot,
  ProjectSummary,
  QueryRecommendation,
  QueryResult,
  SemanticQuery,
  StoredDashboardView,
} from "@bi/ts-contracts";
import {
  Button,
  ErrorBanner,
  Input,
  Panel,
  PanelHeader,
  SectionPanel,
} from "@bi/ui-kit";
import type { DataSourceEntry } from "../../../entities/dataset/types";
import type { ChartVariant } from "../../../entities/chart/types";
import type { QueryBuilderState } from "../../../entities/field/types";
import ChartBuilderPanel from "./ChartBuilderPanel";
import FieldPane from "../../field-pane/ui/FieldPane";
import FilterBar from "../../filter-bar/ui/FilterBar";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";
import type { UiErrorState } from "../../../shared/lib/uiError";
import QueryResultTable from "../../../shared/ui/QueryResultTable";

export interface QueryWorkspaceProps {
  projectId: string;
  path: string;
  projectName: string;
  activeDataSource: LoadedDataSource | null;
  savedProjects: ProjectSummary[];
  dashboardViews: StoredDashboardView[];
  activeDashboardViewId: string | null;
  recentJobs: JobSnapshot[];
  dataSources: DataSourceEntry[];
  error: UiErrorState | null;
  status: string;
  isLoading: boolean;
  isPickingFile: boolean;
  isPersisting: boolean;
  isExporting: boolean;
  activeExportJobId: string | null;
  isRunningQuery: boolean;
  isLoadingRecommendation: boolean;
  queryResult: QueryResult | null;
  profileResult: DataSourceProfile | null;
  queryBuilder: QueryBuilderState;
  chartSpec: ChartSpec | null;
  chartVariant: ChartVariant;
  builtQuery: SemanticQuery | null;
  recommendation: QueryRecommendation | null;
  numericColumns: DataColumn[];
  onProjectNameChange: (value: string) => void;
  onPathChange: (value: string) => void;
  onPickFile: () => void;
  onLoadDataSource: () => void;
  onSaveProject: () => void;
  onImportProject: () => void;
  onSaveDashboardView: () => void;
  onRestoreProject: () => void;
  onExportProject: () => void;
  onWarmDataSourceCache: () => void;
  onProfileDataSource: () => void;
  onExportQueryResult: () => void;
  onExportQueryResultXlsx: () => void;
  onExportQueryResultPdf: () => void;
  onCancelExport: () => void;
  onCancelJob: (jobId: string) => void;
  onRunQuery: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenDashboardView: (dashboardViewId: string) => void;
  onActivateDataSource: (entry: DataSourceEntry) => void;
  onApplyRecommendation: () => void;
  onChartVariantChange: (variant: ChartVariant) => void;
  onAssignChartCategoryField: (fieldName: string) => void;
  onAssignChartValueField: (fieldName: string) => void;
  onUpdateQueryBuilder: <K extends keyof QueryBuilderState>(
    key: K,
    value: QueryBuilderState[K],
  ) => void;
}

function QueryWorkspace({
  projectId,
  projectName,
  activeDataSource,
  savedProjects,
  dashboardViews,
  activeDashboardViewId,
  error,
  status,
  isLoading,
  isPersisting,
  isExporting,
  activeExportJobId,
  isRunningQuery,
  isLoadingRecommendation,
  queryResult,
  queryBuilder,
  chartSpec,
  chartVariant,
  builtQuery,
  recommendation,
  numericColumns,
  onProjectNameChange,
  onSaveProject,
  onImportProject,
  onSaveDashboardView,
  onRestoreProject,
  onExportProject,
  onWarmDataSourceCache,
  onProfileDataSource,
  onExportQueryResult,
  onExportQueryResultXlsx,
  onExportQueryResultPdf,
  onCancelExport,
  onRunQuery,
  onOpenProject,
  onOpenDashboardView,
  onApplyRecommendation,
  onChartVariantChange,
  onAssignChartCategoryField,
  onAssignChartValueField,
  onUpdateQueryBuilder,
}: QueryWorkspaceProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);
  const [showHeavyWorkspaceSections, setShowHeavyWorkspaceSections] =
    useState(false);

  useEffect(() => {
    setShowHeavyWorkspaceSections(false);
    const frameId = window.requestAnimationFrame(() => {
      setShowHeavyWorkspaceSections(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeDataSource?.info.path, projectId, chartVariant, queryResult]);

  return (
    <>
      <div className="workspace-overview-grid">
        <Panel>
          <PanelHeader
            title={copy.queryWorkspace.savedProjects}
            meta={savedProjects.length}
          />
          {savedProjects.length > 0 ? (
            <ul className="project-list">
              {savedProjects.map((project) => {
                const isActive = project.id === projectId;
                return (
                  <li key={project.id}>
                    <Button
                      variant="ghost"
                      className={`project-item${isActive ? " active" : ""}`}
                      onClick={() => onOpenProject(project.id)}
                    >
                      <span className="source-name">{project.name}</span>
                      <span className="source-meta">{project.id}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">{copy.queryWorkspace.noSavedProjects}</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={copy.queryWorkspace.dashboardViews}
            meta={dashboardViews.length}
          />
          {dashboardViews.length > 0 ? (
            <ul className="project-list">
              {dashboardViews.map((dashboardView) => {
                const isActive = dashboardView.id === activeDashboardViewId;
                return (
                  <li key={dashboardView.id}>
                    <Button
                      variant="ghost"
                      className={`project-item${isActive ? " active" : ""}`}
                      onClick={() => onOpenDashboardView(dashboardView.id)}
                    >
                      <span className="source-name">{dashboardView.name}</span>
                      <span className="source-meta">
                        {dashboardView.data_source_path ??
                          copy.queryWorkspace.noDataSource}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">
              {copy.queryWorkspace.noSavedDashboardViews}
            </p>
          )}
        </Panel>
      </div>

      <SectionPanel className="query-panel workspace-studio-shell">
        <PanelHeader
          title={copy.queryWorkspace.queryBuilder}
          meta={copy.queryWorkspace.rowsMeta(queryResult?.totalRows ?? 0)}
        />

        <div className="workspace-toolbar-grid">
          <div className="project-form query-actions">
            <label className="field-label" htmlFor="project-name">
              {copy.queryWorkspace.projectName}
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onProjectNameChange(event.currentTarget.value)
              }
              placeholder={copy.queryWorkspace.projectNamePlaceholder}
              autoComplete="off"
            />
            <p className="helper-text mono-copy">
              {copy.queryWorkspace.projectId(projectId)}
            </p>
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={onSaveProject}
                disabled={isPersisting}
              >
                {isPersisting
                  ? copy.queryWorkspace.working
                  : copy.queryWorkspace.saveProject}
              </Button>
              <Button
                variant="secondary"
                onClick={onImportProject}
                disabled={isPersisting || isExporting || isLoading}
              >
                {isPersisting
                  ? copy.queryWorkspace.working
                  : copy.queryWorkspace.importProjectJson}
              </Button>
              <Button
                variant="secondary"
                onClick={onSaveDashboardView}
                disabled={isPersisting || isLoading || !activeDataSource}
              >
                {copy.queryWorkspace.saveDashboardView}
              </Button>
              <Button
                variant="secondary"
                onClick={onRestoreProject}
                disabled={isPersisting || isLoading || !projectId.trim()}
              >
                {copy.queryWorkspace.openCurrentProject}
              </Button>
              <Button
                variant="secondary"
                onClick={onExportProject}
                disabled={isPersisting || isExporting || isLoading}
              >
                {isExporting
                  ? copy.queryWorkspace.exporting
                  : copy.queryWorkspace.exportProjectJson}
              </Button>
              <Button
                variant="secondary"
                onClick={onWarmDataSourceCache}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  !activeDataSource ||
                  !(
                    activeDataSource.info.cache_path ||
                    activeDataSource.info.type === "parquet"
                  )
                }
              >
                {isLoading && activeDataSource
                  ? copy.queryWorkspace.working
                  : copy.queryWorkspace.warmCache}
              </Button>
              <Button
                variant="secondary"
                onClick={onProfileDataSource}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  !activeDataSource ||
                  !(
                    activeDataSource.info.cache_path ||
                    activeDataSource.info.type === "parquet"
                  )
                }
              >
                {isLoading && activeDataSource
                  ? copy.queryWorkspace.working
                  : copy.queryWorkspace.profileData}
              </Button>
              <Button
                variant="secondary"
                onClick={onExportQueryResult}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  isRunningQuery ||
                  !queryResult
                }
              >
                {isExporting
                  ? copy.queryWorkspace.exporting
                  : copy.queryWorkspace.exportCsv}
              </Button>
              <Button
                variant="secondary"
                onClick={onExportQueryResultXlsx}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  isRunningQuery ||
                  !queryResult
                }
              >
                {isExporting
                  ? copy.queryWorkspace.exporting
                  : copy.queryWorkspace.exportXlsx}
              </Button>
              <Button
                variant="secondary"
                onClick={onExportQueryResultPdf}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  isRunningQuery ||
                  !queryResult
                }
              >
                {isExporting
                  ? copy.queryWorkspace.exporting
                  : copy.queryWorkspace.exportPdf}
              </Button>
              <Button
                variant="default"
                onClick={onRunQuery}
                disabled={
                  isPersisting ||
                  isExporting ||
                  isLoading ||
                  isRunningQuery ||
                  !builtQuery
                }
              >
                {isRunningQuery
                  ? copy.queryWorkspace.running
                  : copy.queryWorkspace.runQuery}
              </Button>
              {activeExportJobId ? (
                <Button variant="ghost" onClick={onCancelExport}>
                  {copy.queryWorkspace.cancelExport}
                </Button>
              ) : null}
            </div>
            {error ? (
              <ErrorBanner
                title={error.title}
                message={error.message}
                details={error.details}
                code={error.code}
              />
            ) : null}
            {!error && status ? (
              <p className="status-message success">{status}</p>
            ) : null}
          </div>
        </div>

        {activeDataSource ? (
          <>
            {showHeavyWorkspaceSections ? (
              <div className="workspace-main-grid">
                <div className="workspace-side-column">
                  <FieldPane
                    activeDataSource={activeDataSource}
                    queryBuilder={queryBuilder}
                    numericColumns={numericColumns}
                    onUpdateQueryBuilder={onUpdateQueryBuilder}
                  />
                </div>
                <div className="workspace-main-column">
                  <Panel>
                    <ChartBuilderPanel
                      queryBuilder={queryBuilder}
                      queryResult={queryResult}
                      chartSpec={chartSpec}
                      chartVariant={chartVariant}
                      isRunningQuery={isRunningQuery}
                      onChartVariantChange={onChartVariantChange}
                      onAssignCategoryField={onAssignChartCategoryField}
                      onAssignValueField={onAssignChartValueField}
                    />
                  </Panel>
                  {queryResult ? (
                    <Panel className="workspace-result-panel">
                      <QueryResultTable
                        title={copy.queryWorkspace.workspaceResultPreview}
                        result={queryResult}
                        interactive
                      />
                    </Panel>
                  ) : null}
                </div>
                <div className="workspace-aux-column">
                  <section className="recommendation-panel">
                    <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
                      <div className="grid gap-1">
                        <h3 className="m-0 text-lg font-semibold text-[#1F2D3D]">
                          {copy.queryWorkspace.backendRecommendation}
                        </h3>
                        <p className="helper-text">
                          {copy.queryWorkspace.backendRecommendationDescription}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={onApplyRecommendation}
                        disabled={!recommendation || isLoadingRecommendation}
                      >
                        {isLoadingRecommendation
                          ? copy.queryWorkspace.loading
                          : copy.queryWorkspace.applyRecommendation}
                      </Button>
                    </div>
                    {recommendation ? (
                      <div className="grid gap-2">
                        <strong className="text-base text-[#1F2D3D]">
                          {recommendation.suggestion.title}
                        </strong>
                        <p className="helper-text">
                          {recommendation.suggestion.reason}
                        </p>
                        <p className="helper-text">
                          {copy.queryWorkspace.suggestedChart(
                            recommendation.chart_spec?.chart_type ??
                              recommendation.suggestion.chart_hint,
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="empty-state">
                        {copy.queryWorkspace.noRecommendation}
                      </p>
                    )}
                  </section>
                  <FilterBar
                    activeDataSource={activeDataSource}
                    queryBuilder={queryBuilder}
                    onUpdateQueryBuilder={onUpdateQueryBuilder}
                  />
                </div>
              </div>
            ) : (
              <Panel>
                <p className="empty-state">
                  {language === "zh"
                    ? "正在准备工作区内容..."
                    : "Preparing workspace content..."}
                </p>
              </Panel>
            )}
          </>
        ) : (
          <p className="empty-state">{copy.queryWorkspace.loadDatasetEmpty}</p>
        )}
      </SectionPanel>
    </>
  );
}

export default QueryWorkspace;
