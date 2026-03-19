use analytics_core::QueryResult;
use connectors::LoadedDataSource;
use metadata_store::ProjectMetadata;
use rust_xlsxwriter::Workbook;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;
use thiserror::Error;

pub const PROJECT_EXPORT_FORMAT_VERSION: &str = "1.0.0";

#[derive(Debug, Error)]
pub enum ExportRuntimeError {
    #[error("Export path must not be empty.")]
    EmptyPath,
    #[error("Export was cancelled.")]
    Cancelled,
    #[error("Failed to read import file: {0}")]
    ReadFailed(String),
    #[error("Failed to serialize export payload: {0}")]
    SerializeFailed(String),
    #[error("Project snapshot is invalid: {0}")]
    InvalidPayload(String),
    #[error("Failed to write export file: {0}")]
    WriteFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectExportPayload {
    pub format_version: String,
    pub exported_at: String,
    pub project: ProjectMetadata,
    pub loaded_data_sources: Vec<LoadedDataSource>,
}

pub fn export_project_snapshot(
    path: impl AsRef<Path>,
    exported_at: impl Into<String>,
    project: ProjectMetadata,
    loaded_data_sources: Vec<LoadedDataSource>,
) -> Result<(), ExportRuntimeError> {
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        return Err(ExportRuntimeError::EmptyPath);
    }

    let payload = ProjectExportPayload {
        format_version: PROJECT_EXPORT_FORMAT_VERSION.to_string(),
        exported_at: exported_at.into(),
        project,
        loaded_data_sources,
    };

    write_project_export(path, &payload)
}

pub fn import_project_snapshot(
    path: impl AsRef<Path>,
) -> Result<ProjectExportPayload, ExportRuntimeError> {
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        return Err(ExportRuntimeError::EmptyPath);
    }

    let serialized = fs::read_to_string(path)
        .map_err(|error| ExportRuntimeError::ReadFailed(error.to_string()))?;
    let payload = serde_json::from_str::<ProjectExportPayload>(&serialized)
        .map_err(|error| ExportRuntimeError::InvalidPayload(error.to_string()))?;

    validate_project_import_payload(&payload)?;

    Ok(payload)
}

pub fn write_project_export(
    path: &Path,
    payload: &ProjectExportPayload,
) -> Result<(), ExportRuntimeError> {
    let serialized = serde_json::to_string_pretty(payload)
        .map_err(|error| ExportRuntimeError::SerializeFailed(error.to_string()))?;
    fs::write(path, serialized).map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))
}

fn validate_project_import_payload(
    payload: &ProjectExportPayload,
) -> Result<(), ExportRuntimeError> {
    if payload.format_version != PROJECT_EXPORT_FORMAT_VERSION {
        return Err(ExportRuntimeError::InvalidPayload(format!(
            "Unsupported format version {}.",
            payload.format_version
        )));
    }

    if payload.project.id.trim().is_empty() {
        return Err(ExportRuntimeError::InvalidPayload(
            "Project id must not be empty.".to_string(),
        ));
    }

    let loaded_by_path = payload
        .loaded_data_sources
        .iter()
        .map(|loaded| (loaded.info.path.as_str(), loaded))
        .collect::<std::collections::HashMap<_, _>>();

    for data_source in &payload.project.data_sources {
        if data_source.path.trim().is_empty() {
            return Err(ExportRuntimeError::InvalidPayload(format!(
                "Data source path is missing for {}.",
                data_source.name
            )));
        }

        if !Path::new(&data_source.path).exists() {
            return Err(ExportRuntimeError::ReadFailed(format!(
                "Referenced data source was not found: {}",
                data_source.path
            )));
        }

        let Some(loaded) = loaded_by_path.get(data_source.path.as_str()) else {
            return Err(ExportRuntimeError::InvalidPayload(format!(
                "Embedded data source definition is missing for {}.",
                data_source.path
            )));
        };

        if loaded.info.name != data_source.name
            || loaded.info.data_source_type != data_source.data_source_type
            || loaded.info.tables != data_source.tables
            || loaded.info.cache_path != data_source.cache_path
            || loaded.total_rows != data_source.total_rows
        {
            return Err(ExportRuntimeError::InvalidPayload(format!(
                "Embedded data source definition does not match project metadata for {}.",
                data_source.path
            )));
        }
    }

    if let Some(active_path) = payload.project.active_data_source_path.as_ref() {
        let is_known = payload
            .project
            .data_sources
            .iter()
            .any(|data_source| &data_source.path == active_path);
        if !is_known {
            return Err(ExportRuntimeError::InvalidPayload(format!(
                "Active data source path is not present in project data sources: {}.",
                active_path
            )));
        }
    }

    Ok(())
}

pub fn export_query_result_csv(
    path: impl AsRef<Path>,
    result: &QueryResult,
) -> Result<(), ExportRuntimeError> {
    export_query_result_csv_with_cancel(path, result, || false)
}

pub fn export_query_result_csv_with_cancel<C>(
    path: impl AsRef<Path>,
    result: &QueryResult,
    mut should_cancel: C,
) -> Result<(), ExportRuntimeError>
where
    C: FnMut() -> bool,
{
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        return Err(ExportRuntimeError::EmptyPath);
    }

    let mut writer = csv::Writer::from_path(path)
        .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))?;

    writer
        .write_record(result.columns.iter())
        .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))?;

    for row in &result.rows {
        if should_cancel() {
            return Err(ExportRuntimeError::Cancelled);
        }
        let ordered_values = result
            .columns
            .iter()
            .map(|column| stringify_csv_value(row.get(column).unwrap_or(&Value::Null)))
            .collect::<Vec<_>>();
        writer
            .write_record(ordered_values.iter())
            .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))?;
    }

    writer
        .flush()
        .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))
}

pub fn export_query_result_xlsx(
    path: impl AsRef<Path>,
    result: &QueryResult,
) -> Result<(), ExportRuntimeError> {
    export_query_result_xlsx_with_cancel(path, result, || false)
}

pub fn export_query_result_xlsx_with_cancel<C>(
    path: impl AsRef<Path>,
    result: &QueryResult,
    mut should_cancel: C,
) -> Result<(), ExportRuntimeError>
where
    C: FnMut() -> bool,
{
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        return Err(ExportRuntimeError::EmptyPath);
    }

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    for (column_index, column) in result.columns.iter().enumerate() {
        worksheet
            .write_string(0, column_index as u16, column)
            .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))?;
    }

    for (row_index, row) in result.rows.iter().enumerate() {
        if should_cancel() {
            return Err(ExportRuntimeError::Cancelled);
        }
        for (column_index, column) in result.columns.iter().enumerate() {
            worksheet
                .write_string(
                    (row_index + 1) as u32,
                    column_index as u16,
                    stringify_cell_value(row.get(column).unwrap_or(&Value::Null)),
                )
                .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))?;
        }
    }

    workbook
        .save(path)
        .map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))
}

pub fn export_query_result_pdf(
    path: impl AsRef<Path>,
    query_name: &str,
    result: &QueryResult,
) -> Result<(), ExportRuntimeError> {
    export_query_result_pdf_with_cancel(path, query_name, result, || false)
}

pub fn export_query_result_pdf_with_cancel<C>(
    path: impl AsRef<Path>,
    query_name: &str,
    result: &QueryResult,
    mut should_cancel: C,
) -> Result<(), ExportRuntimeError>
where
    C: FnMut() -> bool,
{
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        return Err(ExportRuntimeError::EmptyPath);
    }

    let lines = build_pdf_lines(query_name, result, &mut should_cancel)?;
    let pdf_bytes = build_pdf_document(&lines);

    fs::write(path, pdf_bytes).map_err(|error| ExportRuntimeError::WriteFailed(error.to_string()))
}

fn stringify_csv_value(value: &Value) -> String {
    stringify_cell_value(value)
}

fn stringify_cell_value(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(inner) => inner.clone(),
        Value::Bool(inner) => inner.to_string(),
        Value::Number(inner) => inner.to_string(),
        other => other.to_string(),
    }
}

fn build_pdf_lines<C>(
    query_name: &str,
    result: &QueryResult,
    should_cancel: &mut C,
) -> Result<Vec<String>, ExportRuntimeError>
where
    C: FnMut() -> bool,
{
    let mut lines = vec![
        truncate_pdf_line(&format!(
            "Offline BI Query Export: {}",
            if query_name.trim().is_empty() {
                "query-result"
            } else {
                query_name.trim()
            }
        )),
        truncate_pdf_line(&format!(
            "Rows: {} | Columns: {}",
            result.rows.len(),
            result.columns.len()
        )),
        String::new(),
        truncate_pdf_line(&result.columns.join(" | ")),
        "-".repeat(100),
    ];

    for row in &result.rows {
        if should_cancel() {
            return Err(ExportRuntimeError::Cancelled);
        }
        let rendered_row = result
            .columns
            .iter()
            .map(|column| stringify_cell_value(row.get(column).unwrap_or(&Value::Null)))
            .collect::<Vec<_>>()
            .join(" | ");
        lines.push(truncate_pdf_line(&rendered_row));
    }

    Ok(lines)
}

fn truncate_pdf_line(value: &str) -> String {
    const MAX_CHARS: usize = 110;
    let mut chars = value.chars();
    let truncated = chars.by_ref().take(MAX_CHARS).collect::<String>();
    if chars.next().is_some() {
        format!("{truncated}...")
    } else {
        truncated
    }
}

fn build_pdf_document(lines: &[String]) -> Vec<u8> {
    const PAGE_WIDTH: i32 = 595;
    const PAGE_HEIGHT: i32 = 842;
    const MARGIN_LEFT: i32 = 36;
    const MARGIN_TOP: i32 = 806;
    const LEADING: i32 = 14;
    const LINES_PER_PAGE: usize = 50;

    let page_chunks = if lines.is_empty() {
        vec![vec![String::new()]]
    } else {
        lines
            .chunks(LINES_PER_PAGE)
            .map(|chunk| chunk.to_vec())
            .collect::<Vec<_>>()
    };

    let font_object_id = 3 + (page_chunks.len() * 2) as u32;
    let mut pdf = Vec::new();
    let mut offsets = vec![0usize];

    pdf.extend_from_slice(b"%PDF-1.4\n%\xC7\xEC\x8F\xA2\n");

    let page_object_ids = page_chunks
        .iter()
        .enumerate()
        .map(|(index, _)| 3 + (index as u32 * 2))
        .collect::<Vec<_>>();

    write_pdf_object(
        &mut pdf,
        &mut offsets,
        1,
        format!("<< /Type /Catalog /Pages 2 0 R >>"),
    );

    let kids = page_object_ids
        .iter()
        .map(|object_id| format!("{object_id} 0 R"))
        .collect::<Vec<_>>()
        .join(" ");
    write_pdf_object(
        &mut pdf,
        &mut offsets,
        2,
        format!(
            "<< /Type /Pages /Kids [{}] /Count {} >>",
            kids,
            page_chunks.len()
        ),
    );

    for (index, lines_for_page) in page_chunks.iter().enumerate() {
        let page_object_id = 3 + (index as u32 * 2);
        let content_object_id = page_object_id + 1;
        write_pdf_object(
            &mut pdf,
            &mut offsets,
            page_object_id,
            format!(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] /Resources << /Font << /F1 {font_object_id} 0 R >> >> /Contents {content_object_id} 0 R >>"
            ),
        );

        let stream = build_pdf_page_stream(lines_for_page, MARGIN_LEFT, MARGIN_TOP, LEADING);
        write_pdf_stream_object(&mut pdf, &mut offsets, content_object_id, &stream);
    }

    write_pdf_object(
        &mut pdf,
        &mut offsets,
        font_object_id,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string(),
    );

    let xref_offset = pdf.len();
    let object_count = font_object_id as usize;
    pdf.extend_from_slice(format!("xref\n0 {}\n", object_count + 1).as_bytes());
    pdf.extend_from_slice(b"0000000000 65535 f \n");
    for offset in offsets.iter().skip(1) {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            object_count + 1,
            xref_offset
        )
        .as_bytes(),
    );

    pdf
}

fn build_pdf_page_stream(
    lines: &[String],
    margin_left: i32,
    margin_top: i32,
    leading: i32,
) -> String {
    let mut stream = format!("BT\n/F1 10 Tf\n{margin_left} {margin_top} Td\n{leading} TL\n");
    for line in lines {
        stream.push_str(&format!("({}) Tj\nT*\n", escape_pdf_text(line)));
    }
    stream.push_str("ET\n");
    stream
}

fn escape_pdf_text(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
}

fn write_pdf_object(pdf: &mut Vec<u8>, offsets: &mut Vec<usize>, object_id: u32, body: String) {
    offsets.push(pdf.len());
    pdf.extend_from_slice(format!("{object_id} 0 obj\n{body}\nendobj\n").as_bytes());
}

fn write_pdf_stream_object(
    pdf: &mut Vec<u8>,
    offsets: &mut Vec<usize>,
    object_id: u32,
    stream: &str,
) {
    offsets.push(pdf.len());
    pdf.extend_from_slice(
        format!(
            "{object_id} 0 obj\n<< /Length {} >>\nstream\n{}endstream\nendobj\n",
            stream.len(),
            stream
        )
        .as_bytes(),
    );
}

#[cfg(test)]
mod tests {
    use super::{
        export_project_snapshot, export_query_result_csv, export_query_result_csv_with_cancel,
        export_query_result_pdf, export_query_result_xlsx, import_project_snapshot,
        write_project_export, ProjectExportPayload, PROJECT_EXPORT_FORMAT_VERSION,
    };
    use analytics_core::QueryResult;
    use connectors::{DataColumn, DataSourceInfo, LoadedDataSource};
    use metadata_store::{
        DashboardLayoutMetadata, DashboardSectionLayout, DashboardState, ProjectMetadata,
        StoredChartAxis, StoredChartSeriesSpec, StoredChartSpec, StoredDashboardView,
        StoredDataSource, StoredQueryBuilderState,
    };
    use serde_json::{json, Value};
    use std::collections::BTreeMap;
    use std::collections::HashMap;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn writes_project_export_snapshot() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-project-export.json",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));
        let payload = ProjectExportPayload {
            format_version: PROJECT_EXPORT_FORMAT_VERSION.to_string(),
            exported_at: "2026-03-15T10:00:00.000Z".to_string(),
            project: sample_project(),
            loaded_data_sources: vec![sample_loaded_data_source()],
        };

        write_project_export(&export_path, &payload).expect("export should be written");

        let written = fs::read_to_string(&export_path).expect("export file should exist");
        let parsed: serde_json::Value =
            serde_json::from_str(&written).expect("export file should contain valid json");

        assert_eq!(parsed["format_version"], "1.0.0");
        assert_eq!(parsed["project"]["id"], "project-001");
        assert_eq!(parsed["loaded_data_sources"][0]["info"]["name"], "sales");

        fs::remove_file(export_path).expect("export file should be removed");
    }

    #[test]
    fn exports_project_snapshot_from_domain_inputs() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-project-export-runtime.json",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        export_project_snapshot(
            &export_path,
            "2026-03-15T11:00:00.000Z",
            sample_project(),
            vec![sample_loaded_data_source()],
        )
        .expect("project export should be written");

        let written = fs::read_to_string(&export_path).expect("export file should exist");
        let parsed: serde_json::Value =
            serde_json::from_str(&written).expect("export file should contain valid json");

        assert_eq!(parsed["exported_at"], "2026-03-15T11:00:00.000Z");
        assert_eq!(parsed["project"]["name"], "Offline BI Project");

        fs::remove_file(export_path).expect("export file should be removed");
    }

    #[test]
    fn imports_project_snapshot_from_disk() {
        let source_path = temp_source_path("project-import-source.csv");
        fs::write(&source_path, "city\nHong Kong\n").expect("source data should be written");

        let export_path = std::env::temp_dir().join(format!(
            "{}-project-import.json",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));
        let payload = sample_payload_for_path(source_path.to_string_lossy().as_ref());

        write_project_export(&export_path, &payload).expect("export file should be written");

        let imported = import_project_snapshot(&export_path).expect("project import should work");

        assert_eq!(imported, payload);

        fs::remove_file(export_path).expect("export file should be removed");
        fs::remove_file(source_path).expect("source file should be removed");
    }

    #[test]
    fn rejects_project_snapshot_with_missing_referenced_file() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-project-import-missing.json",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));
        let payload = sample_payload_for_path("E:\\missing\\sales.csv");

        write_project_export(&export_path, &payload).expect("export file should be written");

        let error =
            import_project_snapshot(&export_path).expect_err("missing data source should fail");

        assert!(matches!(error, super::ExportRuntimeError::ReadFailed(_)));

        fs::remove_file(export_path).expect("export file should be removed");
    }

    #[test]
    fn exports_query_result_to_csv() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-query-result.csv",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        export_query_result_csv(&export_path, &sample_query_result())
            .expect("query result csv should be written");

        let written = fs::read_to_string(&export_path).expect("csv file should exist");

        assert!(written.contains("city,total_revenue,is_priority"));
        assert!(written.contains("Hong Kong,120.5,true"));
        assert!(written.contains("Shenzhen,200,false"));

        fs::remove_file(export_path).expect("csv file should be removed");
    }

    #[test]
    fn exports_query_result_to_xlsx() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-query-result.xlsx",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        export_query_result_xlsx(&export_path, &sample_query_result())
            .expect("query result xlsx should be written");

        let written = fs::read(&export_path).expect("xlsx file should exist");

        assert!(written.starts_with(b"PK"));

        fs::remove_file(export_path).expect("xlsx file should be removed");
    }

    #[test]
    fn exports_query_result_to_pdf() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-query-result.pdf",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        export_query_result_pdf(&export_path, "Revenue by city", &sample_query_result())
            .expect("query result pdf should be written");

        let written = fs::read(&export_path).expect("pdf file should exist");

        assert!(written.starts_with(b"%PDF-1.4"));
        assert!(String::from_utf8_lossy(&written).contains("Offline BI Query Export"));

        fs::remove_file(export_path).expect("pdf file should be removed");
    }

    #[test]
    fn cancels_csv_export_when_requested() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-query-result-cancel.csv",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        let error =
            export_query_result_csv_with_cancel(&export_path, &sample_query_result(), || true)
                .expect_err("csv export should cancel");

        assert!(matches!(error, super::ExportRuntimeError::Cancelled));
    }

    fn sample_project() -> ProjectMetadata {
        ProjectMetadata {
            id: "project-001".to_string(),
            name: "Offline BI Project".to_string(),
            active_data_source_path: Some("E:\\data\\sales.csv".to_string()),
            data_sources: vec![StoredDataSource {
                name: "sales".to_string(),
                data_source_type: "csv".to_string(),
                path: "E:\\data\\sales.csv".to_string(),
                cache_path: Some("E:\\cache\\sales.parquet".to_string()),
                tables: vec!["default".to_string()],
                total_rows: 120,
            }],
            active_dashboard_view_id: Some("dashboard-view-001".to_string()),
            dashboard_views: vec![StoredDashboardView {
                id: "dashboard-view-001".to_string(),
                name: "Revenue by city".to_string(),
                data_source_path: Some("E:\\data\\sales.csv".to_string()),
                dashboard_state: DashboardState {
                    query_builder: Some(StoredQueryBuilderState {
                        name: "Revenue by city".to_string(),
                        dimension_field: "city".to_string(),
                        dimension_alias: "city".to_string(),
                        measure_field: "revenue".to_string(),
                        measure_alias: "total_revenue".to_string(),
                        measure_aggregation: "sum".to_string(),
                        filter_enabled: false,
                        filter_field: String::new(),
                        filter_operator: "eq".to_string(),
                        filter_value: String::new(),
                        limit: "10".to_string(),
                    }),
                    chart_spec: Some(StoredChartSpec {
                        title: "Revenue by city".to_string(),
                        chart_type: "bar".to_string(),
                        category_axis: Some(StoredChartAxis {
                            field: "city".to_string(),
                            label: "City".to_string(),
                        }),
                        value_axis: Some(StoredChartAxis {
                            field: "total_revenue".to_string(),
                            label: "Revenue".to_string(),
                        }),
                        series: vec![StoredChartSeriesSpec {
                            field: "revenue".to_string(),
                            label: "Revenue".to_string(),
                            aggregation: "sum".to_string(),
                        }],
                    }),
                    layout: DashboardLayoutMetadata {
                        view_mode: "dashboard".to_string(),
                        chart_variant: "bar".to_string(),
                        sections: default_dashboard_sections(),
                    },
                },
            }],
            dashboard_state: Some(DashboardState {
                query_builder: Some(StoredQueryBuilderState {
                    name: "Revenue by city".to_string(),
                    dimension_field: "city".to_string(),
                    dimension_alias: "city".to_string(),
                    measure_field: "revenue".to_string(),
                    measure_alias: "total_revenue".to_string(),
                    measure_aggregation: "sum".to_string(),
                    filter_enabled: false,
                    filter_field: String::new(),
                    filter_operator: "eq".to_string(),
                    filter_value: String::new(),
                    limit: "10".to_string(),
                }),
                chart_spec: Some(StoredChartSpec {
                    title: "Revenue by city".to_string(),
                    chart_type: "bar".to_string(),
                    category_axis: Some(StoredChartAxis {
                        field: "city".to_string(),
                        label: "City".to_string(),
                    }),
                    value_axis: Some(StoredChartAxis {
                        field: "total_revenue".to_string(),
                        label: "Revenue".to_string(),
                    }),
                    series: vec![StoredChartSeriesSpec {
                        field: "revenue".to_string(),
                        label: "Revenue".to_string(),
                        aggregation: "sum".to_string(),
                    }],
                }),
                layout: DashboardLayoutMetadata {
                    view_mode: "dashboard".to_string(),
                    chart_variant: "bar".to_string(),
                    sections: default_dashboard_sections(),
                },
            }),
        }
    }

    fn default_dashboard_sections() -> Vec<DashboardSectionLayout> {
        vec![
            DashboardSectionLayout {
                id: "chart".to_string(),
                size: "wide".to_string(),
            },
            DashboardSectionLayout {
                id: "query".to_string(),
                size: "standard".to_string(),
            },
            DashboardSectionLayout {
                id: "table".to_string(),
                size: "wide".to_string(),
            },
        ]
    }

    fn sample_loaded_data_source() -> LoadedDataSource {
        let mut row = HashMap::new();
        row.insert("city".to_string(), "Hong Kong".to_string());

        LoadedDataSource {
            info: DataSourceInfo {
                name: "sales".to_string(),
                data_source_type: "csv".to_string(),
                path: "E:\\data\\sales.csv".to_string(),
                cache_path: Some("E:\\cache\\sales.parquet".to_string()),
                tables: vec!["default".to_string()],
            },
            columns: vec![DataColumn {
                name: "city".to_string(),
                data_type: "string".to_string(),
            }],
            preview_rows: vec![row],
            total_rows: 120,
        }
    }

    fn sample_payload_for_path(path: &str) -> ProjectExportPayload {
        let mut payload = ProjectExportPayload {
            format_version: PROJECT_EXPORT_FORMAT_VERSION.to_string(),
            exported_at: "2026-03-16T10:00:00.000Z".to_string(),
            project: sample_project(),
            loaded_data_sources: vec![sample_loaded_data_source()],
        };
        payload.project.active_data_source_path = Some(path.to_string());
        payload.project.data_sources[0].path = path.to_string();
        payload.loaded_data_sources[0].info.path = path.to_string();
        payload
    }

    fn temp_source_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "{}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos(),
            name
        ))
    }

    fn sample_query_result() -> QueryResult {
        let mut first_row = BTreeMap::new();
        first_row.insert("city".to_string(), Value::String("Hong Kong".to_string()));
        first_row.insert("total_revenue".to_string(), json!(120.5));
        first_row.insert("is_priority".to_string(), Value::Bool(true));

        let mut second_row = BTreeMap::new();
        second_row.insert("city".to_string(), Value::String("Shenzhen".to_string()));
        second_row.insert("total_revenue".to_string(), json!(200));
        second_row.insert("is_priority".to_string(), Value::Bool(false));

        QueryResult {
            columns: vec![
                "city".to_string(),
                "total_revenue".to_string(),
                "is_priority".to_string(),
            ],
            rows: vec![first_row, second_row],
            total_rows: Some(2),
            execution_time_ms: 12,
        }
    }
}
