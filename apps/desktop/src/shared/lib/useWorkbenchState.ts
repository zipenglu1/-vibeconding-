import { useState } from "react";
import type {
  DataSourceProfile,
  JobSnapshot,
  QueryResult,
  StoredDashboardView,
} from "@bi/ts-contracts";
import { DEFAULT_PROJECT_NAME } from "../../entities/dataset/projectMetadata";
import type { DataSourceEntry } from "../../entities/dataset/types";
import type { QueryBuilderState } from "../../entities/field/types";
import { createEmptyQueryBuilderState } from "../../entities/field/queryBuilder";
import { useAppUiStore } from "./appUiStore";
import type { WorkbenchStatusState } from "./workbenchStatus";
import type { UiErrorState } from "./uiError";

export function useWorkbenchState() {
  const [projectId, setProjectId] = useState("default-project");
  const [path, setPath] = useState("");
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [dataSources, setDataSources] = useState<DataSourceEntry[]>([]);
  const [error, setError] = useState<UiErrorState | null>(null);
  const [status, setStatus] = useState<WorkbenchStatusState>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeExportJobId, setActiveExportJobId] = useState<string | null>(
    null,
  );
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [isHydratingProject, setIsHydratingProject] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [profileResult, setProfileResult] = useState<DataSourceProfile | null>(
    null,
  );
  const [queryBuilder, setQueryBuilder] = useState<QueryBuilderState>(
    createEmptyQueryBuilderState(),
  );
  const [dashboardViews, setDashboardViews] = useState<StoredDashboardView[]>(
    [],
  );
  const [activeDashboardViewId, setActiveDashboardViewId] = useState<
    string | null
  >(null);
  const [recentJobs, setRecentJobs] = useState<JobSnapshot[]>([]);

  const activeDataSourceId = useAppUiStore((state) => state.activeDataSourceId);
  const chartVariant = useAppUiStore((state) => state.chartVariant);
  const chartSpec = useAppUiStore((state) => state.chartSpec);
  const viewMode = useAppUiStore((state) => state.viewMode);
  const language = useAppUiStore((state) => state.language);
  const dashboardLayout = useAppUiStore((state) => state.dashboardLayout);
  const setActiveDataSourceId = useAppUiStore(
    (state) => state.setActiveDataSourceId,
  );
  const setChartVariant = useAppUiStore((state) => state.setChartVariant);
  const setChartSpec = useAppUiStore((state) => state.setChartSpec);
  const setViewMode = useAppUiStore((state) => state.setViewMode);
  const setLanguage = useAppUiStore((state) => state.setLanguage);
  const setDashboardLayout = useAppUiStore((state) => state.setDashboardLayout);

  return {
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
    setLanguage,
    setDashboardLayout,
  };
}
