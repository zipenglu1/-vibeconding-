import type {
  ChartSpec,
  DashboardLayoutMetadata,
  QueryResult,
  SemanticQuery,
} from "@bi/ts-contracts";

export interface DashboardMetric {
  label: string;
  value: string;
}

export interface DashboardViewModel {
  title: string;
  query: SemanticQuery;
  queryResult: QueryResult;
  chartSpec: ChartSpec | null;
  activeDataSourceName: string | null;
  layout: DashboardLayoutMetadata;
}
