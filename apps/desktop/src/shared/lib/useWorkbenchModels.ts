import { useMemo } from "react";
import type {
  ChartSpec,
  DashboardLayoutMetadata,
  QueryRecommendation,
  QueryResult,
  SemanticQuery,
} from "@bi/ts-contracts";
import type { DataSourceEntry } from "../../entities/dataset/types";
import { normalizeDashboardLayout } from "../../entities/dashboard/layout";
import type { DashboardViewModel } from "../../entities/dashboard/types";
import type { QueryBuilderState } from "../../entities/field/types";
import { buildQueryFromBuilder } from "../../entities/field/queryBuilder";

interface UseActiveDataSourceOptions {
  dataSources: DataSourceEntry[];
  activeDataSourceId: string | null;
}

export function useActiveDataSource({
  dataSources,
  activeDataSourceId,
}: UseActiveDataSourceOptions) {
  return useMemo(
    () =>
      dataSources.find((entry) => entry.id === activeDataSourceId)?.loaded ??
      null,
    [activeDataSourceId, dataSources],
  );
}

interface UseWorkbenchDerivedModelsOptions {
  activeDataSource: ReturnType<typeof useActiveDataSource>;
  queryBuilder: QueryBuilderState;
  queryResult: QueryResult | null;
  chartSpec: ChartSpec | null;
  dashboardLayout: DashboardLayoutMetadata;
  recommendations: QueryRecommendation[] | undefined;
}

interface WorkbenchDerivedModels {
  builtQuery: SemanticQuery | null;
  dashboardModel: DashboardViewModel | null;
  primaryRecommendation: QueryRecommendation | null;
}

export function useWorkbenchDerivedModels({
  activeDataSource,
  queryBuilder,
  queryResult,
  chartSpec,
  dashboardLayout,
  recommendations,
}: UseWorkbenchDerivedModelsOptions): WorkbenchDerivedModels {
  const builtQuery = useMemo(
    () =>
      activeDataSource
        ? buildQueryFromBuilder(activeDataSource, queryBuilder)
        : null,
    [activeDataSource, queryBuilder],
  );

  const dashboardModel = useMemo<DashboardViewModel | null>(
    () =>
      queryResult && builtQuery
        ? {
            title: builtQuery.name,
            query: builtQuery,
            queryResult,
            chartSpec,
            activeDataSourceName: activeDataSource?.info.name ?? null,
            layout: normalizeDashboardLayout(dashboardLayout),
          }
        : null,
    [activeDataSource, builtQuery, chartSpec, dashboardLayout, queryResult],
  );

  const primaryRecommendation = useMemo(
    () => recommendations?.[0] ?? null,
    [recommendations],
  );

  return {
    builtQuery,
    dashboardModel,
    primaryRecommendation,
  };
}
