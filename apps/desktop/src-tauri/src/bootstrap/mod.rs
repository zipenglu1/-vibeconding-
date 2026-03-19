use crate::app_state::{
    JobRegistryState, LoadDataSourceJobResultsState, MetadataStoreState,
    ProfileDataSourceJobResultsState,
};
use crate::commands;
use crate::services::open_metadata_store;
use job_runner::JobRegistry;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Builder, Manager};
use telemetry::{init_logging, log_command_event};

pub fn build_application() -> Builder<tauri::Wry> {
    init_logging();
    log_command_event("application", "startup", serde_json::json!({}));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let store = open_metadata_store(app.handle())?;
            log_command_event(
                "metadata_store",
                "ready",
                serde_json::json!({
                    "state": "initialized",
                }),
            );
            let telemetry_settings = telemetry::telemetry_settings();
            log_command_event(
                "telemetry",
                "ready",
                serde_json::json!({
                    "metrics_enabled": telemetry_settings.metrics_enabled,
                    "debug_logging_enabled": telemetry_settings.debug_logging_enabled,
                }),
            );
            app.manage(MetadataStoreState {
                store: Mutex::new(store),
            });
            app.manage(JobRegistryState {
                jobs: JobRegistry::new(),
            });
            app.manage(LoadDataSourceJobResultsState {
                results: Arc::new(Mutex::new(HashMap::new())),
            });
            app.manage(ProfileDataSourceJobResultsState {
                results: Arc::new(Mutex::new(HashMap::new())),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_telemetry_snapshot,
            commands::get_telemetry_settings,
            commands::set_telemetry_debug_logging,
            commands::load_data_source,
            commands::start_load_data_source_job,
            commands::take_load_data_source_job_result,
            commands::execute_query,
            commands::suggest_query_configurations,
            commands::generate_chart_spec,
            commands::save_project_metadata,
            commands::load_project_metadata,
            commands::list_saved_projects,
            commands::export_project_snapshot,
            commands::import_project_snapshot,
            commands::export_query_result,
            commands::export_query_result_xlsx_command,
            commands::export_query_result_pdf_command,
            commands::start_export_query_result_job,
            commands::start_warm_data_source_cache_job,
            commands::start_profile_data_source_job,
            commands::take_profile_data_source_job_result,
            commands::get_job_status,
            commands::cancel_job
        ])
}
