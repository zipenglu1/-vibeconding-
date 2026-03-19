import type {
  ChartSpec,
  DataSourceProfile,
  FieldProfile,
  ExportJobFormat,
  JobHandle,
  JobSnapshot,
  LoadedDataSource,
  ProjectExportPayload,
  ProjectMetadata,
  ProjectSummary,
  QueryRecommendation,
  QueryResult,
  SemanticQuery,
} from "@bi/ts-contracts";
import { invokeCommand, openDialog, saveDialog } from "./tauriBridge";

export async function listSavedProjects() {
  return invokeCommand<ProjectSummary[]>("list_saved_projects");
}

export async function loadDataSourceFromPath(path: string) {
  return invokeCommand<LoadedDataSource>("load_data_source", { path });
}

export async function startLoadDataSourceJob(path: string) {
  return invokeCommand<JobHandle>("start_load_data_source_job", { path });
}

export async function takeLoadDataSourceJobResult(jobId: string) {
  return invokeCommand<LoadedDataSource | null>(
    "take_load_data_source_job_result",
    {
      jobId,
    },
  );
}

export async function openCsvFileDialog() {
  return openDialog({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Tabular data",
        extensions: [
          "csv",
          "xlsx",
          "xls",
          "parquet",
          "db",
          "sqlite",
          "sqlite3",
        ],
      },
      { name: "CSV", extensions: ["csv"] },
      { name: "Excel", extensions: ["xlsx", "xls"] },
      { name: "Parquet", extensions: ["parquet"] },
      { name: "SQLite", extensions: ["db", "sqlite", "sqlite3"] },
    ],
  });
}

export async function saveProjectMetadataRecord(metadata: ProjectMetadata) {
  return invokeCommand<void>("save_project_metadata", { metadata });
}

export async function loadProjectMetadataRecord(projectId: string) {
  return invokeCommand<ProjectMetadata | null>("load_project_metadata", {
    projectId,
  });
}

export async function openProjectExportDialog(defaultPath: string) {
  return saveDialog({
    title: "Export project snapshot",
    defaultPath,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
}

export async function openProjectImportDialog() {
  return openDialog({
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
}

export async function openQueryResultExportDialog(defaultPath: string) {
  return saveDialog({
    title: "Export query result as CSV",
    defaultPath,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
}

export async function openQueryResultXlsxExportDialog(defaultPath: string) {
  return saveDialog({
    title: "Export query result as XLSX",
    defaultPath,
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });
}

export async function openQueryResultPdfExportDialog(defaultPath: string) {
  return saveDialog({
    title: "Export query result as PDF",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
}

export async function exportProjectSnapshotRecord(
  exportPath: string,
  project: ProjectMetadata,
  loadedDataSources: LoadedDataSource[],
  exportedAt: string,
) {
  return invokeCommand<void>("export_project_snapshot", {
    exportPath,
    exportedAt,
    project,
    loadedDataSources,
  });
}

export async function importProjectSnapshotRecord(importPath: string) {
  return invokeCommand<ProjectExportPayload>("import_project_snapshot", {
    importPath,
  });
}

export async function exportQueryResultRecord(
  exportPath: string,
  queryName: string,
  result: QueryResult,
) {
  return invokeCommand<void>("export_query_result", {
    exportPath,
    queryName,
    result,
  });
}

export async function exportQueryResultXlsxRecord(
  exportPath: string,
  queryName: string,
  result: QueryResult,
) {
  return invokeCommand<void>("export_query_result_xlsx_command", {
    exportPath,
    queryName,
    result,
  });
}

export async function exportQueryResultPdfRecord(
  exportPath: string,
  queryName: string,
  result: QueryResult,
) {
  return invokeCommand<void>("export_query_result_pdf_command", {
    exportPath,
    queryName,
    result,
  });
}

export async function startExportQueryResultJob(
  exportPath: string,
  queryName: string,
  result: QueryResult,
  format: ExportJobFormat,
) {
  return invokeCommand<JobHandle>("start_export_query_result_job", {
    exportPath,
    queryName,
    result,
    format,
  });
}

export async function startWarmDataSourceCacheJob(
  dataSourceName: string,
  dataSourcePath: string,
  cachePath: string | null | undefined,
  dataSourceType: string,
) {
  return invokeCommand<JobHandle>("start_warm_data_source_cache_job", {
    dataSourceName,
    dataSourcePath,
    cachePath,
    dataSourceType,
  });
}

export async function startProfileDataSourceJob(
  dataSourceName: string,
  dataSourcePath: string,
  cachePath: string | null | undefined,
  dataSourceType: string,
) {
  return invokeCommand<JobHandle>("start_profile_data_source_job", {
    dataSourceName,
    dataSourcePath,
    cachePath,
    dataSourceType,
  });
}

export async function takeProfileDataSourceJobResult(jobId: string) {
  return invokeCommand<DataSourceProfile | null>(
    "take_profile_data_source_job_result",
    {
      jobId,
    },
  );
}

export async function getJobStatus(jobId: string) {
  return invokeCommand<JobSnapshot | null>("get_job_status", {
    jobId,
  });
}

export async function cancelJob(jobId: string) {
  return invokeCommand<boolean>("cancel_job", {
    jobId,
  });
}

export async function suggestQueryConfigurations(fields: FieldProfile[]) {
  return invokeCommand<QueryRecommendation[]>("suggest_query_configurations", {
    fields,
  });
}

export async function executeSemanticQuery(query: SemanticQuery) {
  return invokeCommand<QueryResult>("execute_query", { query });
}

export async function generateChartSpecForQuery(
  query: SemanticQuery,
  chartType: string,
) {
  return invokeCommand<ChartSpec>("generate_chart_spec", {
    query,
    chartType,
  });
}
