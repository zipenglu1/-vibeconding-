import type {
  ChartSpec,
  DashboardState,
  ProjectMetadata,
  StoredDashboardView,
  StoredQueryBuilderState,
} from "@bi/ts-contracts";
import type { ChartVariant } from "@bi/chart-presets";
import type { DataSourceEntry } from "./types";
import { normalizeDashboardLayout } from "../dashboard/layout";
import type { QueryBuilderState } from "../field/types";
import type { ViewMode } from "../../shared/lib/appUiStore";

export const DEFAULT_PROJECT_NAME = "Offline BI Project";

export function buildProjectMetadata(
  projectName: string,
  projectId: string,
  activeDataSourceId: string | null,
  dataSources: DataSourceEntry[],
  dashboardViews: StoredDashboardView[],
  activeDashboardViewId: string | null,
  queryBuilder: QueryBuilderState,
  chartSpec: ChartSpec | null,
  chartVariant: ChartVariant,
  viewMode: ViewMode,
  dashboardLayout = normalizeDashboardLayout(null),
): ProjectMetadata {
  const nextProjectId = createProjectId(projectName, projectId);
  const currentDashboardState = buildDashboardState(
    queryBuilder,
    chartSpec,
    chartVariant,
    viewMode,
    dashboardLayout,
  );
  const nextDashboardViews = mergeCurrentDashboardView(
    dashboardViews,
    activeDashboardViewId,
    activeDataSourceId,
    currentDashboardState,
  );

  return {
    id: nextProjectId,
    name: projectName.trim().length > 0 ? projectName : DEFAULT_PROJECT_NAME,
    active_data_source_path: activeDataSourceId,
    data_sources: dataSources.map((entry) => ({
      name: entry.loaded.info.name,
      type: entry.loaded.info.type,
      path: entry.loaded.info.path,
      cache_path: entry.loaded.info.cache_path ?? null,
      tables: entry.loaded.info.tables,
      total_rows: entry.loaded.total_rows,
    })),
    active_dashboard_view_id: activeDashboardViewId,
    dashboard_views: nextDashboardViews,
    dashboard_state: currentDashboardState,
  };
}

export function buildDashboardState(
  queryBuilder: QueryBuilderState,
  chartSpec: ChartSpec | null,
  chartVariant: ChartVariant,
  viewMode: ViewMode,
  dashboardLayout = normalizeDashboardLayout(null),
): DashboardState {
  return {
    query_builder: toStoredQueryBuilderState(queryBuilder),
    chart_spec: chartSpec,
    layout: {
      view_mode: viewMode,
      chart_variant: chartVariant,
      sections: normalizeDashboardLayout({
        ...dashboardLayout,
        view_mode: viewMode,
        chart_variant: chartVariant,
      }).sections,
    },
  };
}

export function toStoredQueryBuilderState(
  queryBuilder: QueryBuilderState,
): StoredQueryBuilderState {
  return {
    name: queryBuilder.name,
    dimension_field: queryBuilder.dimensionField,
    dimension_alias: queryBuilder.dimensionAlias,
    measure_field: queryBuilder.measureField,
    measure_alias: queryBuilder.measureAlias,
    measure_aggregation: queryBuilder.measureAggregation,
    filter_enabled: queryBuilder.filterEnabled,
    filter_field: queryBuilder.filterField,
    filter_operator: queryBuilder.filterOperator,
    filter_value: queryBuilder.filterValue,
    limit: queryBuilder.limit,
  };
}

export function fromStoredQueryBuilderState(
  queryBuilder: StoredQueryBuilderState,
): QueryBuilderState {
  return {
    name: queryBuilder.name,
    dimensionField: queryBuilder.dimension_field,
    dimensionAlias: queryBuilder.dimension_alias,
    measureField: queryBuilder.measure_field,
    measureAlias: queryBuilder.measure_alias,
    measureAggregation: queryBuilder.measure_aggregation,
    filterEnabled: queryBuilder.filter_enabled,
    filterField: queryBuilder.filter_field,
    filterOperator: queryBuilder.filter_operator,
    filterValue: queryBuilder.filter_value,
    limit: queryBuilder.limit,
  };
}

function mergeCurrentDashboardView(
  dashboardViews: StoredDashboardView[],
  activeDashboardViewId: string | null,
  activeDataSourceId: string | null,
  dashboardState: DashboardState,
): StoredDashboardView[] {
  if (!activeDashboardViewId) {
    return dashboardViews;
  }

  return dashboardViews.map((view) =>
    view.id === activeDashboardViewId
      ? {
          ...view,
          name: dashboardState.query_builder?.name.trim() || view.name,
          data_source_path: activeDataSourceId,
          dashboard_state: {
            ...dashboardState,
            layout: {
              ...dashboardState.layout,
              view_mode: "dashboard",
            },
          },
        }
      : view,
  );
}

function createProjectId(name: string, currentId: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : currentId;
}
