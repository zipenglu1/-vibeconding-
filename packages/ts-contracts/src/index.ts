export type DataSourceType = "csv" | "excel" | "parquet" | "sqlite" | "duckdb";

export interface Dimension {
  field: string;
  alias?: string;
  granularity?: "year" | "quarter" | "month" | "week" | "day" | "hour";
}

export interface Measure {
  field: string;
  alias?: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max" | "count_distinct";
}

export interface Filter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "not_in"
    | "contains"
    | "is_null"
    | "is_not_null";
  value: string | number | boolean | string[] | number[];
}

export interface SortOrder {
  field: string;
  direction: "asc" | "desc";
}

export interface SemanticQuery {
  id?: string;
  name: string;
  dataSource: string;
  dimensions: Dimension[];
  measures: Measure[];
  filters?: Filter[];
  sort?: SortOrder[];
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  executionTimeMs: number;
}

export interface DataSourceInfo {
  name: string;
  type: DataSourceType;
  path: string;
  cache_path?: string | null;
  tables: string[];
}

export interface DataColumn {
  name: string;
  data_type: string;
}

export interface LoadedDataSource {
  info: DataSourceInfo;
  columns: DataColumn[];
  preview_rows: Record<string, string>[];
  total_rows: number;
}

export interface StoredDataSource {
  name: string;
  type: string;
  path: string;
  cache_path?: string | null;
  tables: string[];
  total_rows: number;
}

export interface StoredQueryBuilderState {
  name: string;
  dimension_field: string;
  dimension_alias: string;
  measure_field: string;
  measure_alias: string;
  measure_aggregation: Measure["aggregation"];
  filter_enabled: boolean;
  filter_field: string;
  filter_operator: Filter["operator"];
  filter_value: string;
  limit: string;
}

export interface DashboardLayoutMetadata {
  view_mode: "workspace" | "dashboard";
  chart_variant: "bar" | "line";
  sections?: DashboardSectionLayout[];
}

export type DashboardSectionId = "chart" | "query" | "table";

export type DashboardSectionSize = "standard" | "wide";

export interface DashboardSectionLayout {
  id: DashboardSectionId;
  size: DashboardSectionSize;
}

export interface DashboardState {
  query_builder: StoredQueryBuilderState | null;
  chart_spec: ChartSpec | null;
  layout: DashboardLayoutMetadata;
}

export interface StoredDashboardView {
  id: string;
  name: string;
  data_source_path: string | null;
  dashboard_state: DashboardState;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  active_data_source_path: string | null;
  data_sources: StoredDataSource[];
  active_dashboard_view_id?: string | null;
  dashboard_views?: StoredDashboardView[];
  dashboard_state?: DashboardState | null;
}

export interface ProjectExportPayload {
  format_version: string;
  exported_at: string;
  project: ProjectMetadata;
  loaded_data_sources: LoadedDataSource[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  active_data_source_path: string | null;
}

export interface QuerySuggestion {
  title: string;
  dimension_field?: string | null;
  measure_field: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max" | "count_distinct";
  chart_hint: "bar" | "line" | "single_value";
  reason: string;
}

export interface ChartAxis {
  field: string;
  label: string;
}

export interface ChartSeriesSpec {
  field: string;
  label: string;
  aggregation: string;
}

export interface ChartSpec {
  title: string;
  chart_type: "bar" | "line" | "single_value";
  category_axis?: ChartAxis | null;
  value_axis?: ChartAxis | null;
  series: ChartSeriesSpec[];
}

export interface QueryRecommendation {
  suggestion: QuerySuggestion;
  chart_spec: ChartSpec | null;
}

export interface FieldProfile {
  name: string;
  data_type: string;
}

export interface ProfiledFieldSummary {
  name: string;
  data_type: string;
  non_null_count: number;
  null_count: number;
  distinct_count: number;
  sample_values: string[];
}

export interface DataSourceProfile {
  row_count: number;
  field_count: number;
  fields: ProfiledFieldSummary[];
}

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ExportJobFormat = "csv" | "xlsx" | "pdf";

export interface JobHandle {
  job_id: string;
  kind: string;
}

export interface JobSnapshot {
  job_id: string;
  kind: string;
  status: JobStatus;
  message: string | null;
  duration_ms: number | null;
  completed: boolean;
}
