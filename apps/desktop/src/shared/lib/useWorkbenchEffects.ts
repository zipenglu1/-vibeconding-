import { useEffect, useRef } from "react";
import type {
  ChartSpec,
  DashboardLayoutMetadata,
  DataSourceProfile,
  LoadedDataSource,
  QueryResult,
} from "@bi/ts-contracts";
import { normalizeDashboardLayout } from "../../entities/dashboard/layout";
import type { QueryBuilderState } from "../../entities/field/types";
import { createQueryBuilderState } from "../../entities/field/queryBuilder";
import type { ViewMode } from "./appUiStore";
import { logFrontendEvent, logFrontendFailure } from "./frontendLogger";
import type { UiErrorState } from "./uiError";
import { toUiError } from "./workbenchUiError";

type SetState<T> = (value: T | ((current: T) => T)) => void;

interface UseWorkbenchEffectsOptions {
  savedProjects: { id: string }[] | undefined;
  savedProjectsError: unknown;
  activeDataSource: LoadedDataSource | null;
  isHydratingProject: boolean;
  viewMode: ViewMode;
  queryResult: QueryResult | null;
  recommendationsError: unknown;
  setError: SetState<UiErrorState | null>;
  setQueryBuilder: SetState<QueryBuilderState>;
  setQueryResult: SetState<QueryResult | null>;
  setProfileResult: SetState<DataSourceProfile | null>;
  setActiveDashboardViewId: SetState<string | null>;
  setChartSpec: (value: ChartSpec | null) => void;
  setViewMode: (value: ViewMode) => void;
  setDashboardLayout: (value: DashboardLayoutMetadata) => void;
}

export function useWorkbenchEffects({
  savedProjects,
  savedProjectsError,
  activeDataSource,
  isHydratingProject,
  viewMode,
  queryResult,
  recommendationsError,
  setError,
  setQueryBuilder,
  setQueryResult,
  setProfileResult,
  setActiveDashboardViewId,
  setChartSpec,
  setViewMode,
  setDashboardLayout,
}: UseWorkbenchEffectsOptions) {
  const lastHandledDataSourcePathRef = useRef<string | null>(null);

  useEffect(() => {
    logFrontendEvent("saved_projects", "start");
  }, []);

  useEffect(() => {
    if (!savedProjects) {
      return;
    }

    logFrontendEvent("saved_projects", "success", {
      project_count: savedProjects.length,
    });
  }, [savedProjects]);

  useEffect(() => {
    if (!savedProjectsError) {
      return;
    }

    const uiError = toUiError(savedProjectsError, "list_projects");
    setError(uiError);
    logFrontendFailure("saved_projects", uiError.message, undefined, {
      message: uiError.message,
      code: uiError.code,
      details: uiError.details,
    });
  }, [savedProjectsError, setError]);

  useEffect(() => {
    const activeDataSourcePath = activeDataSource?.info.path ?? null;

    if (isHydratingProject) {
      lastHandledDataSourcePathRef.current = activeDataSourcePath;
      return;
    }

    if (lastHandledDataSourcePathRef.current === activeDataSourcePath) {
      return;
    }

    lastHandledDataSourcePathRef.current = activeDataSourcePath;
    setQueryBuilder(createQueryBuilderState(activeDataSource));
    setQueryResult(null);
    setProfileResult(null);
    setActiveDashboardViewId(null);
    setChartSpec(null);
    setViewMode("workspace");
    setDashboardLayout(normalizeDashboardLayout(null));
    logFrontendEvent(
      "active_data_source",
      "change",
      activeDataSource
        ? {
            data_source_id: activeDataSourcePath,
            data_source_name: activeDataSource.info.name,
            total_rows: activeDataSource.total_rows,
          }
        : {
            data_source_id: null,
          },
    );
  }, [
    activeDataSource,
    activeDataSource?.info.path,
    isHydratingProject,
    setActiveDashboardViewId,
    setChartSpec,
    setDashboardLayout,
    setProfileResult,
    setQueryBuilder,
    setQueryResult,
    setViewMode,
  ]);

  useEffect(() => {
    logFrontendEvent("view_mode", "change", {
      view_mode: viewMode,
      has_query_result: Boolean(queryResult),
    });
  }, [queryResult, viewMode]);

  useEffect(() => {
    if (!recommendationsError) {
      return;
    }

    const recommendationError = toUiError(
      recommendationsError,
      "list_projects",
    );
    logFrontendFailure(
      "suggest_query_configurations",
      recommendationError.message,
      {
        active_data_source: activeDataSource?.info.path ?? null,
      },
      {
        message: recommendationError.message,
        code: recommendationError.code,
        details: recommendationError.details,
      },
    );
  }, [activeDataSource?.info.path, recommendationsError]);
}
