use crate::app_state::{
    JobRegistryState, LoadDataSourceJobResultsState, MetadataStoreState,
    ProfileDataSourceJobResultsState,
};
use crate::command_support::{
    generate_chart_spec_support, resolve_cache_warmup_target, resolve_profiling_target,
    suggest_query_configurations_support, QueryRecommendation,
};
use crate::security::build_cache_path;
use crate::services::log_command_failure;
use crate::AppError;
use analytics_core::{
    profile_parquet_data_source, ChartSpec, DataSourceProfile, FieldProfile, QueryEngine,
    QueryResult, SemanticQuery,
};
use connectors::{DataSourceLoader, DataSourceLoaderError, LoadedDataSource};
use export_runtime::{
    export_project_snapshot as write_project_snapshot, export_query_result_csv,
    export_query_result_csv_with_cancel, export_query_result_pdf,
    export_query_result_pdf_with_cancel, export_query_result_xlsx,
    export_query_result_xlsx_with_cancel, import_project_snapshot as read_project_snapshot,
    ProjectExportPayload,
};
use job_runner::{run_sync_job, JobHandle, JobSnapshot};
use metadata_store::{ProjectMetadata, ProjectSummary};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::Path;
use tauri::{AppHandle, State};
use telemetry::{
    log_command_event, set_debug_logging, telemetry_settings, telemetry_snapshot,
    TelemetrySettings, TelemetrySnapshot,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExportJobFormat {
    Csv,
    Xlsx,
    Pdf,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    log_command_event(
        "greet",
        "success",
        json!({
            "name": name,
        }),
    );
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_telemetry_snapshot() -> TelemetrySnapshot {
    telemetry_snapshot()
}

#[tauri::command]
pub fn set_telemetry_debug_logging(enabled: bool) -> TelemetrySettings {
    let settings = set_debug_logging(enabled);
    log_command_event(
        "set_telemetry_debug_logging",
        "success",
        json!({
            "debug_logging_enabled": settings.debug_logging_enabled,
            "metrics_enabled": settings.metrics_enabled,
        }),
    );
    settings
}

#[tauri::command]
pub fn get_telemetry_settings() -> TelemetrySettings {
    telemetry_settings()
}

#[tauri::command]
pub fn load_data_source(app: AppHandle, path: &str) -> Result<LoadedDataSource, AppError> {
    log_command_event(
        "load_data_source",
        "start",
        json!({
            "path": path,
        }),
    );

    let cache_path = build_cache_path(&app, std::path::Path::new(path))?;
    let (result, timing) = run_sync_job(|| DataSourceLoader::load_with_cache(path, &cache_path));

    match result {
        Ok(loaded) => {
            log_command_event(
                "load_data_source",
                "success",
                json!({
                    "path": path,
                    "column_count": loaded.columns.len(),
                    "preview_row_count": loaded.preview_rows.len(),
                    "total_rows": loaded.total_rows,
                    "cache_path": loaded.info.cache_path,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(loaded)
        }
        Err(source_error) => {
            let app_error = AppError::from(source_error);
            log_command_failure(
                "load_data_source",
                &app_error,
                json!({
                    "path": path,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn start_load_data_source_job(
    app: AppHandle,
    path: String,
    state: State<'_, JobRegistryState>,
    results_state: State<'_, LoadDataSourceJobResultsState>,
) -> Result<JobHandle, AppError> {
    if path.trim().is_empty() {
        return Err(AppError::data_source_invalid(
            "A local file path is required before loading a data source.",
        ));
    }

    let cache_path = build_cache_path(&app, Path::new(&path))?;
    let stored_results = results_state.results.clone();
    let logged_path = path.clone();
    let job = state
        .jobs
        .spawn_tracked_job("load_data_source", move |context| {
            context.set_message(format!("Loading data source from {path}"));
            let loaded = DataSourceLoader::load_with_cache_cancellable(&path, &cache_path, || {
                context.is_cancelled()
            });

            match loaded {
                Ok(loaded) => {
                    context.checkpoint()?;
                    let mut results = stored_results.lock().map_err(|error| {
                        format!("Failed to store data source job result: {error}")
                    })?;
                    results.insert(context.job_id().to_string(), loaded.clone());
                    Ok(format!(
                        "Loaded {} rows from {}",
                        loaded.total_rows, loaded.info.name
                    ))
                }
                Err(DataSourceLoaderError::Cancelled) => Err("Cancelled".to_string()),
                Err(error) => Err(error.to_string()),
            }
        });

    log_command_event(
        "start_load_data_source_job",
        "success",
        json!({
            "job_id": job.job_id,
            "path": logged_path,
        }),
    );

    Ok(job)
}

#[tauri::command]
pub fn take_load_data_source_job_result(
    job_id: &str,
    state: State<'_, LoadDataSourceJobResultsState>,
) -> Result<Option<LoadedDataSource>, AppError> {
    let mut results = state
        .results
        .lock()
        .map_err(|error| AppError::storage(error.to_string()))?;
    Ok(results.remove(job_id))
}

#[tauri::command]
pub fn execute_query(query: SemanticQuery) -> Result<QueryResult, AppError> {
    let query_name = query.name.clone();
    let data_source = query.data_source.clone();
    let dimension_count = query.dimensions.len();
    let measure_count = query.measures.len();

    log_command_event(
        "execute_query",
        "start",
        json!({
            "query_name": query_name,
            "data_source": data_source,
            "dimension_count": dimension_count,
            "measure_count": measure_count,
        }),
    );

    let (result, timing) = run_sync_job(|| QueryEngine::execute(&query));

    match result {
        Ok(result) => {
            log_command_event(
                "execute_query",
                "success",
                json!({
                    "query_name": query.name,
                    "data_source": query.data_source,
                    "dimension_count": query.dimensions.len(),
                    "measure_count": query.measures.len(),
                    "returned_rows": result.rows.len(),
                    "result_columns": result.columns.len(),
                    "execution_time_ms": result.execution_time_ms,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(result)
        }
        Err(source_error) => {
            let app_error = AppError::from(source_error);
            log_command_failure(
                "execute_query",
                &app_error,
                json!({
                    "query_name": query.name,
                    "data_source": query.data_source,
                    "dimension_count": query.dimensions.len(),
                    "measure_count": query.measures.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn suggest_query_configurations(
    fields: Vec<FieldProfile>,
) -> Result<Vec<QueryRecommendation>, AppError> {
    log_command_event(
        "suggest_query_configurations",
        "start",
        json!({
            "field_count": fields.len(),
        }),
    );

    let (result, timing) = run_sync_job(|| suggest_query_configurations_support(fields.clone()));

    match result {
        Ok(recommendations) => {
            log_command_event(
                "suggest_query_configurations",
                "success",
                json!({
                    "field_count": fields.len(),
                    "recommendation_count": recommendations.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(recommendations)
        }
        Err(app_error) => {
            log_command_failure(
                "suggest_query_configurations",
                &app_error,
                json!({
                    "field_count": fields.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn generate_chart_spec(query: SemanticQuery, chart_type: &str) -> Result<ChartSpec, AppError> {
    log_command_event(
        "generate_chart_spec",
        "start",
        json!({
            "query_name": query.name,
            "chart_type": chart_type,
            "dimension_count": query.dimensions.len(),
            "measure_count": query.measures.len(),
        }),
    );

    let chart_type_owned = chart_type.to_string();
    let (result, timing) =
        run_sync_job(|| generate_chart_spec_support(query.clone(), &chart_type_owned));

    match result {
        Ok(chart_spec) => {
            log_command_event(
                "generate_chart_spec",
                "success",
                json!({
                    "query_name": query.name,
                    "chart_type": chart_type,
                    "series_count": chart_spec.series.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(chart_spec)
        }
        Err(app_error) => {
            log_command_failure(
                "generate_chart_spec",
                &app_error,
                json!({
                    "query_name": query.name,
                    "chart_type": chart_type,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn save_project_metadata(
    metadata: ProjectMetadata,
    state: State<'_, MetadataStoreState>,
) -> Result<(), AppError> {
    let project_id = metadata.id.clone();
    let data_source_count = metadata.data_sources.len();
    log_command_event(
        "save_project_metadata",
        "start",
        json!({
            "project_id": project_id,
            "data_source_count": data_source_count,
        }),
    );

    let (result, timing) = run_sync_job(|| {
        state
            .store
            .lock()
            .map_err(|error| AppError::storage(error.to_string()))?
            .save_project(&metadata)
            .map_err(AppError::from)
    });

    match result {
        Ok(_) => {
            log_command_event(
                "save_project_metadata",
                "success",
                json!({
                    "project_id": metadata.id,
                    "data_source_count": metadata.data_sources.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(())
        }
        Err(app_error) => {
            log_command_failure(
                "save_project_metadata",
                &app_error,
                json!({
                    "project_id": metadata.id,
                    "data_source_count": metadata.data_sources.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn load_project_metadata(
    project_id: &str,
    state: State<'_, MetadataStoreState>,
) -> Result<Option<ProjectMetadata>, AppError> {
    log_command_event(
        "load_project_metadata",
        "start",
        json!({
            "project_id": project_id,
        }),
    );

    let (result, timing) = run_sync_job(|| {
        state
            .store
            .lock()
            .map_err(|error| AppError::storage(error.to_string()))?
            .load_project(project_id)
            .map_err(AppError::from)
    });

    match result {
        Ok(project) => {
            log_command_event(
                "load_project_metadata",
                "success",
                json!({
                    "project_id": project_id,
                    "found": project.is_some(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(project)
        }
        Err(app_error) => {
            log_command_failure(
                "load_project_metadata",
                &app_error,
                json!({
                    "project_id": project_id,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn list_saved_projects(
    state: State<'_, MetadataStoreState>,
) -> Result<Vec<ProjectSummary>, AppError> {
    log_command_event("list_saved_projects", "start", json!({}));

    let (result, timing) = run_sync_job(|| {
        state
            .store
            .lock()
            .map_err(|error| AppError::storage(error.to_string()))?
            .list_projects()
            .map_err(AppError::from)
    });

    match result {
        Ok(projects) => {
            log_command_event(
                "list_saved_projects",
                "success",
                json!({
                    "project_count": projects.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(projects)
        }
        Err(app_error) => {
            log_command_failure(
                "list_saved_projects",
                &app_error,
                json!({
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn export_project_snapshot(
    export_path: &str,
    exported_at: &str,
    project: ProjectMetadata,
    loaded_data_sources: Vec<LoadedDataSource>,
) -> Result<(), AppError> {
    let project_id = project.id.clone();
    let data_source_count = loaded_data_sources.len();
    log_command_event(
        "export_project_snapshot",
        "start",
        json!({
            "export_path": export_path,
            "project_id": project_id,
            "data_source_count": data_source_count,
            "exported_at": exported_at,
        }),
    );

    if export_path.trim().is_empty() {
        let app_error = AppError::file_write("Export path must not be empty.");
        log_command_failure(
            "export_project_snapshot",
            &app_error,
            json!({
                "export_path": export_path,
                "project_id": project_id,
                "duration_ms": 0,
            }),
        );
        return Err(app_error);
    }

    let (result, timing) = run_sync_job(|| {
        write_project_snapshot(export_path, exported_at, project, loaded_data_sources)
    });

    match result {
        Ok(_) => {
            log_command_event(
                "export_project_snapshot",
                "success",
                json!({
                    "export_path": export_path,
                    "project_id": project_id,
                    "data_source_count": data_source_count,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(())
        }
        Err(export_error) => {
            let app_error = AppError::from(export_error);
            log_command_failure(
                "export_project_snapshot",
                &app_error,
                json!({
                    "export_path": export_path,
                    "project_id": project_id,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn import_project_snapshot(
    import_path: &str,
    state: State<'_, MetadataStoreState>,
) -> Result<ProjectExportPayload, AppError> {
    log_command_event(
        "import_project_snapshot",
        "start",
        json!({
            "import_path": import_path,
        }),
    );

    if import_path.trim().is_empty() {
        let app_error = AppError::file_read("Import path must not be empty.");
        log_command_failure(
            "import_project_snapshot",
            &app_error,
            json!({
                "import_path": import_path,
                "duration_ms": 0,
            }),
        );
        return Err(app_error);
    }

    let (result, timing) = run_sync_job(|| {
        let payload = read_project_snapshot(import_path)?;
        state
            .store
            .lock()
            .map_err(|error| AppError::storage(error.to_string()))?
            .save_project(&payload.project)
            .map_err(AppError::from)?;
        Ok::<ProjectExportPayload, AppError>(payload)
    });

    match result {
        Ok(payload) => {
            log_command_event(
                "import_project_snapshot",
                "success",
                json!({
                    "import_path": import_path,
                    "project_id": payload.project.id,
                    "data_source_count": payload.project.data_sources.len(),
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(payload)
        }
        Err(app_error) => {
            log_command_failure(
                "import_project_snapshot",
                &app_error,
                json!({
                    "import_path": import_path,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

#[tauri::command]
pub fn export_query_result(
    export_path: &str,
    query_name: &str,
    result: QueryResult,
) -> Result<(), AppError> {
    export_query_result_artifact(
        "export_query_result",
        export_path,
        query_name,
        &result,
        || export_query_result_csv(export_path, &result),
    )
}

#[tauri::command]
pub fn export_query_result_xlsx_command(
    export_path: &str,
    query_name: &str,
    result: QueryResult,
) -> Result<(), AppError> {
    export_query_result_artifact(
        "export_query_result_xlsx",
        export_path,
        query_name,
        &result,
        || export_query_result_xlsx(export_path, &result),
    )
}

#[tauri::command]
pub fn export_query_result_pdf_command(
    export_path: &str,
    query_name: &str,
    result: QueryResult,
) -> Result<(), AppError> {
    export_query_result_artifact(
        "export_query_result_pdf",
        export_path,
        query_name,
        &result,
        || export_query_result_pdf(export_path, query_name, &result),
    )
}

#[tauri::command]
pub fn start_export_query_result_job(
    export_path: String,
    query_name: String,
    result: QueryResult,
    format: ExportJobFormat,
    state: State<'_, JobRegistryState>,
) -> Result<JobHandle, AppError> {
    if export_path.trim().is_empty() {
        return Err(AppError::file_write("Export path must not be empty."));
    }

    let kind = format!("export_query_result_{format:?}").to_lowercase();
    let format_name = format_label(&format).to_string();
    let logged_format_name = format_name.clone();
    let logged_query_name = query_name.clone();
    let job_query_name = query_name.clone();
    let job = state.jobs.spawn_tracked_job(kind, move |context| {
        context.set_message(format!("Exporting {} result", format_name));
        let export_result = match format {
            ExportJobFormat::Csv => {
                export_query_result_csv_with_cancel(&export_path, &result, || {
                    context.is_cancelled()
                })
            }
            ExportJobFormat::Xlsx => {
                export_query_result_xlsx_with_cancel(&export_path, &result, || {
                    context.is_cancelled()
                })
            }
            ExportJobFormat::Pdf => {
                export_query_result_pdf_with_cancel(&export_path, &job_query_name, &result, || {
                    context.is_cancelled()
                })
            }
        };

        match export_result {
            Ok(_) => Ok(format!(
                "Exported {} result to {}",
                format_name, export_path
            )),
            Err(export_runtime::ExportRuntimeError::Cancelled) => Err("Cancelled".to_string()),
            Err(error) => Err(error.to_string()),
        }
    });

    log_command_event(
        "start_export_query_result_job",
        "success",
        json!({
            "job_id": job.job_id,
            "format": logged_format_name,
            "query_name": logged_query_name,
        }),
    );

    Ok(job)
}

#[tauri::command]
pub fn start_warm_data_source_cache_job(
    data_source_name: String,
    data_source_path: String,
    cache_path: Option<String>,
    data_source_type: String,
    state: State<'_, JobRegistryState>,
) -> Result<JobHandle, AppError> {
    let (warmup_path, uses_cached_artifact, normalized_type) =
        resolve_cache_warmup_target(&data_source_path, cache_path.as_deref(), &data_source_type)?;

    let logged_name = data_source_name.clone();
    let logged_type = normalized_type.clone();
    let logged_path = warmup_path.clone();
    let job = state
        .jobs
        .spawn_tracked_job("warm_data_source_cache", move |context| {
            context.set_message(format!("Warming cache for {data_source_name}"));
            context.checkpoint()?;

            let loaded = DataSourceLoader::load_parquet(&warmup_path);
            match loaded {
                Ok(loaded) => {
                    context.checkpoint()?;
                    Ok(format!(
                        "Warmed cache for {} ({} rows)",
                        loaded.info.name, loaded.total_rows
                    ))
                }
                Err(DataSourceLoaderError::Cancelled) => Err("Cancelled".to_string()),
                Err(error) => Err(error.to_string()),
            }
        });

    log_command_event(
        "start_warm_data_source_cache_job",
        "success",
        json!({
            "job_id": job.job_id,
            "data_source_name": logged_name,
            "data_source_type": logged_type,
            "warmup_path": logged_path,
            "uses_cached_artifact": uses_cached_artifact,
        }),
    );

    Ok(job)
}

#[tauri::command]
pub fn start_profile_data_source_job(
    data_source_name: String,
    data_source_path: String,
    cache_path: Option<String>,
    data_source_type: String,
    state: State<'_, JobRegistryState>,
    results_state: State<'_, ProfileDataSourceJobResultsState>,
) -> Result<JobHandle, AppError> {
    let profile_path =
        resolve_profiling_target(&data_source_path, cache_path.as_deref(), &data_source_type)?;
    let stored_results = results_state.results.clone();
    let logged_name = data_source_name.clone();
    let logged_type = data_source_type.clone();
    let logged_path = profile_path.clone();

    let job = state
        .jobs
        .spawn_tracked_job("profile_data_source", move |context| {
            context.set_message(format!("Profiling {data_source_name}"));
            context.checkpoint()?;

            let profile =
                profile_parquet_data_source(&profile_path).map_err(|error| error.to_string())?;

            context.checkpoint()?;
            let mut results = stored_results
                .lock()
                .map_err(|error| format!("Failed to store profiling job result: {error}"))?;
            results.insert(context.job_id().to_string(), profile.clone());

            Ok(format!(
                "Profiled {} fields across {} rows",
                profile.field_count, profile.row_count
            ))
        });

    log_command_event(
        "start_profile_data_source_job",
        "success",
        json!({
            "job_id": job.job_id,
            "data_source_name": logged_name,
            "data_source_type": logged_type,
            "profile_path": logged_path,
        }),
    );

    Ok(job)
}

#[tauri::command]
pub fn take_profile_data_source_job_result(
    job_id: &str,
    state: State<'_, ProfileDataSourceJobResultsState>,
) -> Result<Option<DataSourceProfile>, AppError> {
    let mut results = state
        .results
        .lock()
        .map_err(|error| AppError::storage(error.to_string()))?;
    Ok(results.remove(job_id))
}

#[tauri::command]
pub fn get_job_status(
    job_id: &str,
    state: State<'_, JobRegistryState>,
) -> Result<Option<JobSnapshot>, AppError> {
    Ok(state.jobs.snapshot(job_id))
}

#[tauri::command]
pub fn cancel_job(job_id: &str, state: State<'_, JobRegistryState>) -> Result<bool, AppError> {
    Ok(state.jobs.cancel(job_id))
}

fn export_query_result_artifact<F>(
    command_name: &str,
    export_path: &str,
    query_name: &str,
    result: &QueryResult,
    export_fn: F,
) -> Result<(), AppError>
where
    F: FnOnce() -> Result<(), export_runtime::ExportRuntimeError>,
{
    let row_count = result.rows.len();
    let column_count = result.columns.len();
    log_command_event(
        command_name,
        "start",
        json!({
            "export_path": export_path,
            "query_name": query_name,
            "column_count": column_count,
            "row_count": row_count,
        }),
    );

    if export_path.trim().is_empty() {
        let app_error = AppError::file_write("Export path must not be empty.");
        log_command_failure(
            command_name,
            &app_error,
            json!({
                "export_path": export_path,
                "query_name": query_name,
                "duration_ms": 0,
            }),
        );
        return Err(app_error);
    }

    let (export_result, timing) = run_sync_job(export_fn);

    match export_result {
        Ok(_) => {
            log_command_event(
                command_name,
                "success",
                json!({
                    "export_path": export_path,
                    "query_name": query_name,
                    "row_count": row_count,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Ok(())
        }
        Err(export_error) => {
            let app_error = AppError::from(export_error);
            log_command_failure(
                command_name,
                &app_error,
                json!({
                    "export_path": export_path,
                    "query_name": query_name,
                    "duration_ms": timing.duration_ms,
                }),
            );
            Err(app_error)
        }
    }
}

fn format_label(format: &ExportJobFormat) -> &'static str {
    match format {
        ExportJobFormat::Csv => "csv",
        ExportJobFormat::Xlsx => "xlsx",
        ExportJobFormat::Pdf => "pdf",
    }
}
