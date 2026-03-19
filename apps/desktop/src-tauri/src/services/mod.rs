use crate::AppError;
#[cfg(feature = "desktop-runtime")]
use metadata_store::MetadataStore;
use serde_json::Value;
#[cfg(feature = "desktop-runtime")]
use std::fs;
#[cfg(feature = "desktop-runtime")]
use tauri::{AppHandle, Manager};
use telemetry::{log_command_failure as emit_command_failure, ErrorPayload};

#[cfg(feature = "desktop-runtime")]
pub fn open_metadata_store(app: &AppHandle) -> Result<MetadataStore, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::storage(error.to_string()))?;
    fs::create_dir_all(&app_data_dir).map_err(|error| AppError::file_write(error.to_string()))?;
    let database_path = app_data_dir.join("offline-desktop-bi.sqlite");
    MetadataStore::open(database_path).map_err(AppError::from)
}

pub fn log_command_failure(command: &str, error: &AppError, context: Value) {
    emit_command_failure(
        command,
        ErrorPayload {
            code: error.code.to_string(),
            message: error.message.clone(),
            details: error.details.clone(),
        },
        context,
    );
}

#[cfg(test)]
mod tests {
    #[cfg(feature = "desktop-runtime")]
    use connectors::{DataColumn, DataSourceInfo, LoadedDataSource};
    #[cfg(feature = "desktop-runtime")]
    use export_runtime::export_project_snapshot as write_project_snapshot;
    #[cfg(feature = "desktop-runtime")]
    use metadata_store::{ProjectMetadata, StoredDataSource};
    use serde_json::json;
    #[cfg(feature = "desktop-runtime")]
    use std::collections::HashMap;
    #[cfg(feature = "desktop-runtime")]
    use std::fs;
    #[cfg(feature = "desktop-runtime")]
    use std::time::{SystemTime, UNIX_EPOCH};
    use telemetry::build_log_entry;

    #[cfg(feature = "desktop-runtime")]
    #[test]
    fn writes_project_export_snapshot() {
        let export_path = std::env::temp_dir().join(format!(
            "{}-project-export.json",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos()
        ));

        write_project_snapshot(
            &export_path,
            "2026-03-15T10:00:00.000Z",
            sample_project(),
            vec![sample_loaded_data_source()],
        )
        .expect("export should be written");

        let written = fs::read_to_string(&export_path).expect("export file should exist");
        let parsed: serde_json::Value =
            serde_json::from_str(&written).expect("export file should contain valid json");

        assert_eq!(parsed["format_version"], "1.0.0");
        assert_eq!(parsed["project"]["id"], "project-001");
        assert_eq!(parsed["loaded_data_sources"][0]["info"]["name"], "sales");

        fs::remove_file(export_path).expect("export file should be removed");
    }

    #[test]
    fn builds_structured_log_entries() {
        let entry = build_log_entry(
            "INFO",
            "load_data_source",
            "success",
            None,
            json!({
                "path": "E:\\data\\sales.csv",
                "total_rows": 120,
            }),
        );

        let parsed: serde_json::Value =
            serde_json::from_str(&entry).expect("log entry should contain valid json");

        assert_eq!(parsed["level"], "INFO");
        assert_eq!(parsed["event"], "tauri_command");
        assert_eq!(parsed["command"], "load_data_source");
        assert_eq!(parsed["status"], "success");
        assert_eq!(parsed["context"]["total_rows"], 120);
        assert!(parsed["ts_ms"].as_u64().is_some());
    }

    #[cfg(feature = "desktop-runtime")]
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
            active_dashboard_view_id: None,
            dashboard_views: vec![],
            dashboard_state: None,
        }
    }

    #[cfg(feature = "desktop-runtime")]
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
}
