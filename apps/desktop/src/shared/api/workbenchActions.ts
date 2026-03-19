import type { QueryClient } from "@tanstack/react-query";
import type {
  ChartSpec,
  DataSourceProfile,
  DashboardState,
  ExportJobFormat,
  JobSnapshot,
  LoadedDataSource,
  ProjectExportPayload,
  ProjectMetadata,
  QueryRecommendation,
  QueryResult,
  StoredDashboardView,
} from "@bi/ts-contracts";
import type { ChartVariant } from "@bi/chart-presets";
import type { DataSourceEntry } from "../../entities/dataset/types";
import type { QueryBuilderState } from "../../entities/field/types";
import {
  buildQueryFromBuilder,
  createQueryBuilderState,
} from "../../entities/field/queryBuilder";
import {
  buildDashboardState,
  fromStoredQueryBuilderState,
} from "../../entities/dataset/projectMetadata";
import { normalizeDashboardLayout } from "../../entities/dashboard/layout";
import { logFrontendEvent, logFrontendFailure } from "../lib/frontendLogger";
import type { AppLanguage } from "../lib/appLanguage";
import type { ViewMode } from "../lib/appUiStore";
import { getWorkbenchCopy } from "../lib/i18n";
import type { WorkbenchStatusState } from "../lib/workbenchStatus";
import type { UiErrorState } from "../lib/uiError";
import { toUiError } from "../lib/workbenchUiError";
import {
  cancelJob,
  executeSemanticQuery,
  exportProjectSnapshotRecord,
  getJobStatus,
  generateChartSpecForQuery,
  importProjectSnapshotRecord,
  loadProjectMetadataRecord,
  openCsvFileDialog,
  openProjectImportDialog,
  openProjectExportDialog,
  openQueryResultExportDialog,
  openQueryResultPdfExportDialog,
  openQueryResultXlsxExportDialog,
  saveProjectMetadataRecord,
  startExportQueryResultJob,
  startLoadDataSourceJob,
  startProfileDataSourceJob,
  startWarmDataSourceCacheJob,
  takeLoadDataSourceJobResult,
  takeProfileDataSourceJobResult,
} from "./workbenchApi";

type SetState<T> = (value: T | ((current: T) => T)) => void;

interface WorkbenchActionDeps {
  queryClient: QueryClient;
  projectId: string;
  projectName: string;
  activeDataSource: LoadedDataSource | null;
  dataSources: DataSourceEntry[];
  dashboardViews: StoredDashboardView[];
  recentJobs: JobSnapshot[];
  queryBuilder: QueryBuilderState;
  chartSpec: ChartSpec | null;
  builtQuery: QueryWorkspaceBuiltQuery;
  queryResult: QueryResult | null;
  activeExportJobId: string | null;
  chartVariant: string;
  viewMode: ViewMode;
  language: AppLanguage;
  dashboardLayout: DashboardState["layout"];
  setProjectId: SetState<string>;
  setPath: SetState<string>;
  setProjectName: SetState<string>;
  setDataSources: SetState<DataSourceEntry[]>;
  setDashboardViews: SetState<StoredDashboardView[]>;
  setRecentJobs: SetState<JobSnapshot[]>;
  setError: SetState<UiErrorState | null>;
  setStatus: SetState<WorkbenchStatusState>;
  setIsLoading: SetState<boolean>;
  setIsPickingFile: SetState<boolean>;
  setIsPersisting: SetState<boolean>;
  setIsExporting: SetState<boolean>;
  setActiveExportJobId: SetState<string | null>;
  setIsRunningQuery: SetState<boolean>;
  setIsHydratingProject: SetState<boolean>;
  setQueryResult: SetState<QueryResult | null>;
  setProfileResult: SetState<DataSourceProfile | null>;
  setQueryBuilder: SetState<QueryBuilderState>;
  setActiveDashboardViewId: SetState<string | null>;
  setChartVariant: (value: ChartVariant) => void;
  setChartSpec: (value: ChartSpec | null) => void;
  setViewMode: (value: ViewMode) => void;
  setDashboardLayout: (value: DashboardState["layout"]) => void;
  setActiveDataSourceId: (value: string | null) => void;
  buildProjectMetadata: () => ProjectMetadata;
}

type QueryWorkspaceBuiltQuery =
  | Parameters<typeof executeSemanticQuery>[0]
  | null;

interface ExecuteQueryOptions {
  eventName: string;
  switchToDashboard: boolean;
  clearPreviousResult: boolean;
}

export function createWorkbenchActions({
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
  buildProjectMetadata,
}: WorkbenchActionDeps) {
  const copy = getWorkbenchCopy(language);

  async function loadDataSource(
    nextPath: string,
  ): Promise<LoadedDataSource | null> {
    if (!nextPath.trim()) {
      return null;
    }

    logFrontendEvent("load_data_source", "start", {
      path: nextPath,
    });
    setIsLoading(true);
    setError(null);
    setStatus("");

    try {
      const job = await startLoadDataSourceJob(nextPath);
      upsertRecentJob({
        job_id: job.job_id,
        kind: job.kind,
        status: "queued",
        message: copy.actions.queued,
        duration_ms: 0,
        completed: false,
      });
      const jobSnapshot = await waitForJobCompletion(
        job.job_id,
        copy.actions.dataSourceLoadMissingStatus,
      );

      if (jobSnapshot.status === "cancelled") {
        setStatus(copy.actions.dataSourceLoadCancelled);
        return null;
      }
      if (jobSnapshot.status === "failed") {
        throw new Error(jobSnapshot.message ?? copy.actions.dataSourceLoadFailed);
      }

      const loaded = await takeLoadDataSourceJobResult(job.job_id);
      if (!loaded) {
        throw new Error(copy.actions.dataSourceResultUnavailable);
      }

      applyLoadedDataSource(loaded);
      setStatus({
        kind: "loadedDataSource",
        name: loaded.info.name,
        rows: loaded.total_rows,
      });
      logFrontendEvent("load_data_source", "success", {
        path: loaded.info.path,
        data_source_name: loaded.info.name,
        total_rows: loaded.total_rows,
        column_count: loaded.columns.length,
      });
      return loaded;
    } catch (submitError) {
      const uiError = toUiError(submitError, "load_data_source");
      setError(uiError);
      logFrontendFailure(
        "load_data_source",
        uiError.message,
        {
          path: nextPath,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreDashboardState(
    dashboardState: DashboardState | null | undefined,
    loadedDataSources: LoadedDataSource[],
    activeDataSourcePath: string | null,
  ) {
    if (!dashboardState) {
      setQueryBuilder(createQueryBuilderState(null));
      setQueryResult(null);
      setProfileResult(null);
      setChartSpec(null);
      setChartVariant("bar");
      setViewMode("workspace");
      setDashboardLayout(normalizeDashboardLayout(null));
      return;
    }

    const restoredQueryBuilder = dashboardState.query_builder
      ? fromStoredQueryBuilderState(dashboardState.query_builder)
      : createQueryBuilderState(null);
    const restoredChartVariant = dashboardState.layout.chart_variant;
    const restoredViewMode = dashboardState.layout.view_mode;

    setQueryBuilder(restoredQueryBuilder);
    setChartVariant(restoredChartVariant);
    setChartSpec(dashboardState.chart_spec);
    setViewMode(restoredViewMode);
    setDashboardLayout(normalizeDashboardLayout(dashboardState.layout));
    setQueryResult(null);
    setProfileResult(null);

    if (restoredViewMode !== "dashboard") {
      return;
    }

    const restoredDataSource = loadedDataSources.find(
      (entry) => entry.info.path === activeDataSourcePath,
    );
    if (!restoredDataSource) {
      setViewMode("workspace");
      setStatus(copy.actions.restoreDataSourceMissing);
      return;
    }

    const restoredQuery = buildQueryFromBuilder(
      restoredDataSource,
      restoredQueryBuilder,
    );
    if (!restoredQuery) {
      setViewMode("workspace");
      setStatus(copy.actions.restoreQueryInvalid);
      return;
    }

    try {
      const result = await executeSemanticQuery(restoredQuery);
      setQueryResult(result);
      setStatus({
        kind: "restoredDashboard",
        name: restoredQuery.name,
      });
    } catch (restoreQueryError) {
      const uiError = toUiError(restoreQueryError, "open_project");
      setError(uiError);
      setQueryResult(null);
      setChartSpec(null);
      setViewMode("workspace");
      setStatus(copy.actions.restoreQueryFailed);
    }
  }

  async function handlePickFile() {
    logFrontendEvent("pick_file", "start");
    setIsPickingFile(true);
    setError(null);
    setStatus("");

    try {
      const selected = await openCsvFileDialog();
      if (typeof selected === "string") {
        logFrontendEvent("pick_file", "success", {
          selected_path: selected,
        });
        await loadDataSource(selected);
      } else {
        logFrontendEvent("pick_file", "cancelled");
      }
    } catch (pickError) {
      const uiError = toUiError(pickError, "pick_file");
      setError(uiError);
      logFrontendFailure("pick_file", uiError.message, undefined, {
        message: uiError.message,
        code: uiError.code,
        details: uiError.details,
      });
    } finally {
      setIsPickingFile(false);
    }
  }

  async function handleSaveProject() {
    logFrontendEvent("save_project", "start", {
      project_id: projectId,
      project_name: projectName,
      data_source_count: dataSources.length,
    });
    setIsPersisting(true);
    setError(null);
    setStatus("");

    try {
      const metadata = buildProjectMetadata();
      await saveProjectMetadataRecord(metadata);
      setProjectId(metadata.id);
      await queryClient.invalidateQueries({ queryKey: ["saved-projects"] });
      setStatus(copy.actions.savedProject(metadata.name, metadata.data_sources.length));
      logFrontendEvent("save_project", "success", {
        project_id: metadata.id,
        project_name: metadata.name,
        data_source_count: metadata.data_sources.length,
      });
    } catch (saveError) {
      const uiError = toUiError(saveError, "save_project");
      setError(uiError);
      logFrontendFailure(
        "save_project",
        uiError.message,
        {
          project_id: projectId,
          project_name: projectName,
          data_source_count: dataSources.length,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsPersisting(false);
    }
  }

  function handleSaveDashboardView() {
    if (!activeDataSource) {
      setStatus(copy.actions.saveDashboardViewRequiresDataSource);
      return;
    }

    const dashboardState = buildCurrentDashboardState("dashboard");
    const nextViewId = createDashboardViewId(queryBuilder.name);
    const nextView: StoredDashboardView = {
      id: nextViewId,
      name:
        dashboardState.query_builder?.name.trim() ||
        copy.actions.dashboardViewFallback(dashboardViews.length + 1),
      data_source_path: activeDataSource.info.path,
      dashboard_state: dashboardState,
    };

    setDashboardViews((current) => [...current, nextView]);
    setActiveDashboardViewId(nextViewId);
    setStatus({
      kind: "dashboardViewAdded",
      name: nextView.name,
    });
    setError(null);
    logFrontendEvent("save_dashboard_view", "success", {
      dashboard_view_id: nextView.id,
      dashboard_view_name: nextView.name,
      data_source_path: nextView.data_source_path,
    });
  }

  async function handleImportProject() {
    logFrontendEvent("import_project", "start");
    setIsPersisting(true);
    setError(null);
    setStatus("");

    try {
      const importPath = await openProjectImportDialog();
      if (typeof importPath !== "string" || !importPath.trim()) {
        setStatus(copy.actions.importCancelled);
        logFrontendEvent("import_project", "cancelled");
        return;
      }

      const payload = await importProjectSnapshotRecord(importPath);
      await hydrateImportedProject(payload);

      await queryClient.invalidateQueries({ queryKey: ["saved-projects"] });
      const restoredDashboardView = resolveActiveDashboardView(
        payload.project.dashboard_views ?? [],
        payload.project.active_dashboard_view_id ?? null,
      );
      const restoredDashboardState = resolveDashboardStateToRestore(
        restoredDashboardView?.dashboard_state,
        payload.project.dashboard_state,
      );
      if (
        !restoredDashboardState ||
        restoredDashboardState.layout.view_mode !== "dashboard"
      ) {
        setStatus(
          copy.actions.importedProject(
            payload.project.name,
            payload.project.data_sources.length,
          ),
        );
      }
      logFrontendEvent("import_project", "success", {
        import_path: importPath,
        project_id: payload.project.id,
        data_source_count: payload.project.data_sources.length,
      });
    } catch (importError) {
      const uiError = toUiError(importError, "import_project");
      setError(uiError);
      logFrontendFailure("import_project", uiError.message, undefined, {
        message: uiError.message,
        code: uiError.code,
        details: uiError.details,
      });
    } finally {
      setIsHydratingProject(false);
      setIsPersisting(false);
    }
  }

  async function handleExportProject() {
    logFrontendEvent("export_project", "start", {
      project_id: projectId,
      project_name: projectName,
      data_source_count: dataSources.length,
    });
    setIsExporting(true);
    setError(null);
    setStatus("");

    try {
      const metadata = buildProjectMetadata();
      const exportPath = await openProjectExportDialog(
        `${metadata.id}-export.json`,
      );
      if (typeof exportPath !== "string" || !exportPath.trim()) {
        setStatus(copy.actions.exportCancelled);
        logFrontendEvent("export_project", "cancelled", {
          project_id: metadata.id,
        });
        return;
      }

      await exportProjectSnapshotRecord(
        exportPath,
        metadata,
        dataSources.map((entry) => entry.loaded),
        new Date().toISOString(),
      );
      setProjectId(metadata.id);
      setStatus(copy.actions.exportedProject(metadata.name, exportPath));
      logFrontendEvent("export_project", "success", {
        project_id: metadata.id,
        project_name: metadata.name,
        export_path: exportPath,
      });
    } catch (exportError) {
      const uiError = toUiError(exportError, "export_project");
      setError(uiError);
      logFrontendFailure(
        "export_project",
        uiError.message,
        {
          project_id: projectId,
          project_name: projectName,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportQueryResult() {
    await handleExportQueryResultByFormat("csv");
  }

  async function handleExportQueryResultXlsx() {
    await handleExportQueryResultByFormat("xlsx");
  }

  async function handleExportQueryResultPdf() {
    await handleExportQueryResultByFormat("pdf");
  }

  async function handleWarmDataSourceCache() {
    if (!activeDataSource) {
      setStatus(copy.actions.warmCacheRequiresDataSource);
      return;
    }

    const dataSourceName = activeDataSource.info.name;
    const dataSourcePath = activeDataSource.info.path;
    const cachePath = activeDataSource.info.cache_path;
    const dataSourceType = activeDataSource.info.type;
    logFrontendEvent("warm_data_source_cache", "start", {
      data_source_name: dataSourceName,
      data_source_type: dataSourceType,
      cache_path: cachePath ?? null,
    });
    setIsLoading(true);
    setError(null);
    setStatus("");

    try {
      const job = await startWarmDataSourceCacheJob(
        dataSourceName,
        dataSourcePath,
        cachePath,
        dataSourceType,
      );
      upsertRecentJob({
        job_id: job.job_id,
        kind: job.kind,
        status: "queued",
        message: copy.actions.queued,
        duration_ms: 0,
        completed: false,
      });

      const jobSnapshot = await waitForJobCompletion(
        job.job_id,
        copy.actions.warmCacheMissingStatus,
      );
      if (jobSnapshot.status === "cancelled") {
        setStatus(copy.actions.warmCacheCancelled(dataSourceName));
        return;
      }
      if (jobSnapshot.status === "failed") {
        throw new Error(jobSnapshot.message ?? copy.actions.warmCacheFailed);
      }

      setStatus(copy.actions.warmedCache(dataSourceName));
      logFrontendEvent("warm_data_source_cache", "success", {
        data_source_name: dataSourceName,
        data_source_type: dataSourceType,
        job_id: job.job_id,
      });
    } catch (warmupError) {
      const uiError = toUiError(warmupError, "warm_data_source_cache");
      setError(uiError);
      logFrontendFailure(
        "warm_data_source_cache",
        uiError.message,
        {
          data_source_name: dataSourceName,
          data_source_type: dataSourceType,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileDataSource() {
    if (!activeDataSource) {
      setStatus(copy.actions.profileRequiresDataSource);
      return;
    }

    const dataSourceName = activeDataSource.info.name;
    const dataSourcePath = activeDataSource.info.path;
    const cachePath = activeDataSource.info.cache_path;
    const dataSourceType = activeDataSource.info.type;
    logFrontendEvent("profile_data_source", "start", {
      data_source_name: dataSourceName,
      data_source_type: dataSourceType,
      cache_path: cachePath ?? null,
    });
    setIsLoading(true);
    setError(null);
    setStatus("");

    try {
      const job = await startProfileDataSourceJob(
        dataSourceName,
        dataSourcePath,
        cachePath,
        dataSourceType,
      );
      upsertRecentJob({
        job_id: job.job_id,
        kind: job.kind,
        status: "queued",
        message: copy.actions.queued,
        duration_ms: 0,
        completed: false,
      });

      const jobSnapshot = await waitForJobCompletion(
        job.job_id,
        copy.actions.profileMissingStatus,
      );
      if (jobSnapshot.status === "cancelled") {
        setStatus(copy.actions.profileCancelled(dataSourceName));
        return;
      }
      if (jobSnapshot.status === "failed") {
        throw new Error(jobSnapshot.message ?? copy.actions.profileFailed);
      }

      const profile = await takeProfileDataSourceJobResult(job.job_id);
      if (!profile) {
        throw new Error(copy.actions.profileUnavailable);
      }

      setProfileResult(profile);
      setStatus(
        copy.actions.profiledDataSource(
          dataSourceName,
          profile.field_count,
          profile.row_count,
        ),
      );
      logFrontendEvent("profile_data_source", "success", {
        data_source_name: dataSourceName,
        data_source_type: dataSourceType,
        row_count: profile.row_count,
        field_count: profile.field_count,
        job_id: job.job_id,
      });
    } catch (profileError) {
      const uiError = toUiError(profileError, "profile_data_source");
      setError(uiError);
      logFrontendFailure(
        "profile_data_source",
        uiError.message,
        {
          data_source_name: dataSourceName,
          data_source_type: dataSourceType,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportQueryResultByFormat(format: ExportJobFormat) {
    if (!queryResult) {
      return;
    }

    const queryName = builtQuery?.name?.trim() || "query-result";
    const formatLabel = format.toUpperCase();
    logFrontendEvent("export_query_result", "start", {
      query_name: queryName,
      format,
      row_count: queryResult.rows.length,
      column_count: queryResult.columns.length,
    });
    setIsExporting(true);
    setError(null);
    setStatus("");

    try {
      const exportPath = await openQueryResultExportDialogForFormat(
        format,
        `${slugifyFileName(queryName)}.${format}`,
      );
      if (typeof exportPath !== "string" || !exportPath.trim()) {
        setStatus(copy.actions.exportQueryCancelled(formatLabel));
        logFrontendEvent("export_query_result", "cancelled", {
          query_name: queryName,
          format,
        });
        return;
      }

      const job = await startExportQueryResultJob(
        exportPath,
        queryName,
        queryResult,
        format,
      );
      upsertRecentJob({
        job_id: job.job_id,
        kind: job.kind,
        status: "queued",
        message: copy.actions.queued,
        duration_ms: 0,
        completed: false,
      });
      setActiveExportJobId(job.job_id);
      const jobSnapshot = await waitForJobCompletion(job.job_id);

      if (jobSnapshot.status === "cancelled") {
        setStatus(copy.actions.exportQueryCancelled(formatLabel));
        return;
      }
      if (jobSnapshot.status === "failed") {
        throw new Error(
          jobSnapshot.message ?? copy.actions.exportQueryFailed(formatLabel),
        );
      }

      setStatus(
        copy.actions.exportedQueryResult(queryName, formatLabel, exportPath),
      );
      logFrontendEvent("export_query_result", "success", {
        query_name: queryName,
        format,
        export_path: exportPath,
        row_count: queryResult.rows.length,
        job_id: job.job_id,
      });
    } catch (exportError) {
      const uiError = toUiError(exportError, "export_query_result");
      setError(uiError);
      logFrontendFailure(
        "export_query_result",
        uiError.message,
        {
          query_name: queryName,
          format,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setActiveExportJobId(null);
      setIsExporting(false);
    }
  }

  async function handleCancelExport() {
    setStatus(copy.actions.cancellingExport);
    if (!activeExportJobId) {
      return;
    }

    await handleCancelJob(activeExportJobId);
  }

  async function handleCancelJob(jobId: string) {
    const cancelled = await cancelJob(jobId);
    if (cancelled) {
      upsertRecentJob({
        job_id: jobId,
        kind: recentJobKind(jobId),
        status: "running",
        message: copy.actions.cancellationRequested,
        duration_ms: currentJobDuration(),
        completed: false,
      });
    }
  }

  async function handleOpenProject(nextProjectId: string) {
    logFrontendEvent("open_project", "start", {
      project_id: nextProjectId,
    });
    setIsPersisting(true);
    setError(null);
    setStatus("");

    try {
      const metadata = await loadProjectMetadataRecord(nextProjectId);
      if (!metadata) {
        setStatus(copy.actions.noSavedProjectMetadata);
        logFrontendEvent("open_project", "success", {
          project_id: nextProjectId,
          found: false,
        });
        return;
      }

      setIsHydratingProject(true);
      setProjectId(metadata.id);
      setProjectName(metadata.name);
      setDataSources([]);
      setDashboardViews(metadata.dashboard_views ?? []);
      setActiveDashboardViewId(metadata.active_dashboard_view_id ?? null);
      setActiveDataSourceId(null);
      setPath("");
      setChartSpec(null);
      setQueryResult(null);
      setProfileResult(null);

      const loadedDataSources: LoadedDataSource[] = [];
      for (const dataSource of metadata.data_sources) {
        const loaded = await loadDataSource(dataSource.path);
        if (loaded) {
          loadedDataSources.push(loaded);
        }
      }
      const restoredDashboardView = resolveActiveDashboardView(
        metadata.dashboard_views ?? [],
        metadata.active_dashboard_view_id ?? null,
      );
      const restoredDashboardState = resolveDashboardStateToRestore(
        restoredDashboardView?.dashboard_state,
        metadata.dashboard_state,
      );
      const restoredDataSourcePath =
        restoredDashboardView?.data_source_path ??
        metadata.active_data_source_path;
      if (restoredDataSourcePath) {
        setActiveDataSourceId(restoredDataSourcePath);
        setPath(restoredDataSourcePath);
      }
      await restoreDashboardState(
        restoredDashboardState,
        loadedDataSources,
        restoredDataSourcePath,
      );

      await queryClient.invalidateQueries({ queryKey: ["saved-projects"] });
      if (
        !restoredDashboardState ||
        restoredDashboardState.layout.view_mode !== "dashboard"
      ) {
        setStatus(
          copy.actions.openedProject(
            metadata.name,
            metadata.data_sources.length,
          ),
        );
      }
      logFrontendEvent("open_project", "success", {
        project_id: metadata.id,
        project_name: metadata.name,
        data_source_count: metadata.data_sources.length,
        active_data_source_path: restoredDataSourcePath,
        active_dashboard_view_id: restoredDashboardView?.id ?? null,
        restored_view_mode: restoredDashboardState?.layout.view_mode ?? "workspace",
      });
    } catch (restoreError) {
      const uiError = toUiError(restoreError, "open_project");
      setError(uiError);
      logFrontendFailure(
        "open_project",
        uiError.message,
        {
          project_id: nextProjectId,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsHydratingProject(false);
      setIsPersisting(false);
    }
  }

  async function executeWorkbenchQuery(
    nextQuery: NonNullable<QueryWorkspaceBuiltQuery>,
    options: ExecuteQueryOptions,
  ) {
    logFrontendEvent(options.eventName, "start", {
      query_name: nextQuery.name,
      data_source: nextQuery.dataSource,
      dimension_count: nextQuery.dimensions.length,
      measure_count: nextQuery.measures.length,
      has_filters: Boolean(nextQuery.filters?.length),
      limit: nextQuery.limit,
    });
    setIsRunningQuery(true);
    setError(null);
    setStatus("");

    if (options.clearPreviousResult) {
      setQueryResult(null);
      setChartSpec(null);
    }

    try {
      const result = await executeSemanticQuery(nextQuery);
      const nextChartSpec = await generateChartSpecForQuery(
        nextQuery,
        chartVariant,
      );
      setQueryResult(result);
      setChartSpec(nextChartSpec);
      setViewMode(options.switchToDashboard ? "dashboard" : "workspace");
      setStatus({
        kind: "queryExecuted",
        name: nextQuery.name,
        rows: result.rows.length,
      });
      logFrontendEvent(options.eventName, "success", {
        query_name: nextQuery.name,
        returned_rows: result.rows.length,
        total_rows: result.totalRows,
        column_count: result.columns.length,
        execution_time_ms: result.executionTimeMs,
      });
    } catch (queryError) {
      setQueryResult(null);
      setChartSpec(null);
      const uiError = toUiError(queryError, "run_query");
      setError(uiError);
      logFrontendFailure(
        options.eventName,
        uiError.message,
        {
          query_name: nextQuery.name,
          data_source: nextQuery.dataSource,
        },
        {
          message: uiError.message,
          code: uiError.code,
          details: uiError.details,
        },
      );
    } finally {
      setIsRunningQuery(false);
    }
  }

  async function autoBuildChart(
    updates: Partial<
      Pick<
        QueryBuilderState,
        | "dimensionField"
        | "dimensionAlias"
        | "measureField"
        | "measureAlias"
        | "name"
      >
    >,
  ) {
    if (!activeDataSource) {
      return;
    }

    const nextBuilder: QueryBuilderState = {
      ...queryBuilder,
      ...updates,
    };

    if (!nextBuilder.name.trim()) {
      const measureLabel =
        nextBuilder.measureAlias ||
        (nextBuilder.measureField
          ? `${nextBuilder.measureAggregation}_${nextBuilder.measureField}`
          : "");
      const dimensionLabel =
        nextBuilder.dimensionAlias || nextBuilder.dimensionField;

      nextBuilder.name =
        measureLabel && dimensionLabel
          ? `${measureLabel} by ${dimensionLabel}`
          : "Ad hoc query";
    }

    setQueryBuilder(nextBuilder);
    setError(null);

    if (!nextBuilder.dimensionField || !nextBuilder.measureField) {
      setQueryResult(null);
      setChartSpec(null);
      setStatus("");
      return;
    }

    const nextQuery = buildQueryFromBuilder(activeDataSource, nextBuilder);
    if (!nextQuery) {
      setQueryResult(null);
      setChartSpec(null);
      setStatus("");
      return;
    }

    await executeWorkbenchQuery(nextQuery, {
      eventName: "build_chart",
      switchToDashboard: false,
      clearPreviousResult: true,
    });
  }

  async function handleRunQuery() {
    if (!builtQuery) {
      const uiError = {
        title: copy.actions.incompleteQueryTitle,
        message: copy.actions.incompleteQueryMessage,
      };
      setError(uiError);
      setStatus("");
      logFrontendFailure("run_query", uiError.message, {
        has_active_data_source: Boolean(activeDataSource),
      });
      return;
    }

    await executeWorkbenchQuery(builtQuery, {
      eventName: "run_query",
      switchToDashboard: true,
      clearPreviousResult: false,
    });
  }

  function applyRecommendation(recommendation: QueryRecommendation | null) {
    if (!activeDataSource || !recommendation) {
      return;
    }

    const baseState = createQueryBuilderState(activeDataSource);
    const suggestion = recommendation.suggestion;
    const nextChartType =
      recommendation.chart_spec?.chart_type ?? suggestion.chart_hint;

    setQueryBuilder({
      ...baseState,
      name: suggestion.title,
      dimensionField: suggestion.dimension_field ?? "",
      dimensionAlias: suggestion.dimension_field ?? "",
      measureField: suggestion.measure_field,
      measureAlias: `${suggestion.aggregation}_${suggestion.measure_field}`,
      measureAggregation: suggestion.aggregation,
    });

    if (nextChartType === "bar" || nextChartType === "line") {
      setChartVariant(nextChartType);
    }
    setChartSpec(
      recommendation.chart_spec
        ? {
            ...recommendation.chart_spec,
            chart_type: nextChartType,
          }
        : null,
    );

    setStatus(copy.actions.recommendationApplied(suggestion.title));
    setError(null);
    logFrontendEvent("apply_recommendation", "success", {
      title: suggestion.title,
      chart_type: nextChartType,
      measure_field: suggestion.measure_field,
      dimension_field: suggestion.dimension_field ?? null,
    });
  }

  return {
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
  };

  async function hydrateImportedProject(payload: ProjectExportPayload) {
    const importedEntries = payload.loaded_data_sources.map((loaded) => ({
      id: loaded.info.path,
      loaded,
    }));
    const activePath =
      payload.project.active_data_source_path ??
      payload.loaded_data_sources[0]?.info.path ??
      null;

    setIsHydratingProject(true);
    setProjectId(payload.project.id);
    setProjectName(payload.project.name);
    setDataSources(importedEntries);
    setDashboardViews(payload.project.dashboard_views ?? []);
    setActiveDashboardViewId(payload.project.active_dashboard_view_id ?? null);
    const restoredDashboardView = resolveActiveDashboardView(
      payload.project.dashboard_views ?? [],
      payload.project.active_dashboard_view_id ?? null,
    );
    const restoredDataSourcePath =
      restoredDashboardView?.data_source_path ?? activePath;
    setActiveDataSourceId(restoredDataSourcePath);
    setPath(restoredDataSourcePath ?? "");
    setChartSpec(null);
    setQueryResult(null);
    setProfileResult(null);

    await restoreDashboardState(
      resolveDashboardStateToRestore(
        restoredDashboardView?.dashboard_state,
        payload.project.dashboard_state,
      ),
      payload.loaded_data_sources,
      restoredDataSourcePath,
    );
  }

  async function handleOpenDashboardView(dashboardViewId: string) {
    const dashboardView = dashboardViews.find(
      (view) => view.id === dashboardViewId,
    );
    if (!dashboardView) {
      setStatus(copy.actions.dashboardViewMissing);
      return;
    }

    setIsHydratingProject(true);
    setError(null);
    setStatus("");

    try {
      setActiveDashboardViewId(dashboardView.id);
      if (dashboardView.data_source_path) {
        setActiveDataSourceId(dashboardView.data_source_path);
        setPath(dashboardView.data_source_path);
      }

      await restoreDashboardState(
        forceDashboardViewMode(dashboardView.dashboard_state),
        dataSources.map((entry) => entry.loaded),
        dashboardView.data_source_path,
      );
      setStatus({
        kind: "openedDashboardView",
        name: dashboardView.name,
      });
      logFrontendEvent("open_dashboard_view", "success", {
        dashboard_view_id: dashboardView.id,
        dashboard_view_name: dashboardView.name,
        data_source_path: dashboardView.data_source_path,
      });
    } finally {
      setIsHydratingProject(false);
    }
  }

  async function waitForJobCompletion(
    jobId: string,
    missingSnapshotMessage = copy.actions.exportStatusMissing,
  ) {
    for (;;) {
      const snapshot = await getJobStatus(jobId);
      if (!snapshot) {
        throw new Error(missingSnapshotMessage);
      }

      upsertRecentJob(snapshot);

      if (snapshot.completed) {
        return snapshot;
      }

      if (snapshot.message) {
        setStatus(snapshot.message);
      }

      await delay(250);
    }
  }

  function buildCurrentDashboardState(nextViewMode = viewMode) {
    return buildDashboardState(
      queryBuilder,
      chartSpec,
      chartVariant as ChartVariant,
      nextViewMode,
      normalizeDashboardLayout(dashboardLayout),
    );
  }

  function upsertRecentJob(nextJob: JobSnapshot) {
    setRecentJobs((current) => {
      const existingIndex = current.findIndex(
        (job) => job.job_id === nextJob.job_id,
      );
      if (existingIndex === -1) {
        return [nextJob, ...current].slice(0, 8);
      }

      const updated = [...current];
      updated[existingIndex] = nextJob;
      return updated;
    });
  }

  function recentJobKind(jobId: string) {
    return recentJobs.find((job) => job.job_id === jobId)?.kind ?? "export";
  }

  function currentJobDuration() {
    return null;
  }

  function applyLoadedDataSource(loaded: LoadedDataSource) {
    const nextId = loaded.info.path;
    setDataSources((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === nextId);
      if (existingIndex === -1) {
        return [...current, { id: nextId, loaded }];
      }

      const updated = [...current];
      updated[existingIndex] = { id: nextId, loaded };
      return updated;
    });
    setActiveDataSourceId(nextId);
    setPath(loaded.info.path);
    setQueryResult(null);
    setProfileResult(null);
    setChartSpec(null);
    setViewMode("workspace");
  }
}

function slugifyFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "query-result";
}

function openQueryResultExportDialogForFormat(
  format: "csv" | "xlsx" | "pdf",
  defaultPath: string,
) {
  switch (format) {
    case "xlsx":
      return openQueryResultXlsxExportDialog(defaultPath);
    case "pdf":
      return openQueryResultPdfExportDialog(defaultPath);
    case "csv":
    default:
      return openQueryResultExportDialog(defaultPath);
  }
}

function delay(timeoutMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
}

function createDashboardViewId(name: string) {
  return `${slugifyFileName(name || "dashboard-view")}-${Date.now()}`;
}

function resolveActiveDashboardView(
  dashboardViews: StoredDashboardView[],
  activeDashboardViewId: string | null,
) {
  if (dashboardViews.length === 0) {
    return null;
  }

  return (
    dashboardViews.find((view) => view.id === activeDashboardViewId) ??
    dashboardViews[0]
  );
}

function resolveDashboardStateToRestore(
  dashboardViewState: DashboardState | null | undefined,
  projectDashboardState: DashboardState | null | undefined,
) {
  if (dashboardViewState) {
    return forceDashboardViewMode(dashboardViewState);
  }

  return projectDashboardState;
}

function forceDashboardViewMode(
  dashboardState: DashboardState | null | undefined,
): DashboardState | null | undefined {
  if (!dashboardState) {
    return dashboardState;
  }

  return {
    ...dashboardState,
    layout: {
      ...dashboardState.layout,
      view_mode: "dashboard" as const,
    },
  };
}
