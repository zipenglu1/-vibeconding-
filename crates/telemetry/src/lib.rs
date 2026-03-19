use log::{error, info};
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::io::Write;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_LOG_FILTER: &str = "info";
const TELEMETRY_DEBUG_ENV: &str = "OFFLINE_BI_TELEMETRY_DEBUG";
const TELEMETRY_METRICS_ENV: &str = "OFFLINE_BI_TELEMETRY_METRICS";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ErrorPayload {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct TelemetrySettings {
    pub metrics_enabled: bool,
    pub debug_logging_enabled: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct CommandMetricSummary {
    pub command: String,
    pub sample_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub total_duration_ms: u128,
    pub average_duration_ms: u128,
    pub last_duration_ms: Option<u128>,
    pub last_status: Option<String>,
    pub last_sample_ts_ms: Option<u128>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct TelemetrySnapshot {
    pub settings: TelemetrySettings,
    pub sampled_event_count: u64,
    pub command_metrics: Vec<CommandMetricSummary>,
}

#[derive(Debug, Clone, Default)]
struct CommandMetricState {
    sample_count: u64,
    success_count: u64,
    failure_count: u64,
    total_duration_ms: u128,
    last_duration_ms: Option<u128>,
    last_status: Option<String>,
    last_sample_ts_ms: Option<u128>,
}

#[derive(Debug, Clone)]
struct TelemetryState {
    settings: TelemetrySettings,
    sampled_event_count: u64,
    command_metrics: BTreeMap<String, CommandMetricState>,
}

static TELEMETRY_STATE: OnceLock<Mutex<TelemetryState>> = OnceLock::new();

pub fn init_logging() {
    let mut builder = env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or(DEFAULT_LOG_FILTER),
    );
    builder.format(|buf, record| writeln!(buf, "{}", record.args()));
    let _ = builder.try_init();

    let _ = telemetry_state();
}

pub fn telemetry_settings() -> TelemetrySettings {
    with_telemetry_state(|state| state.settings.clone())
}

pub fn set_debug_logging(enabled: bool) -> TelemetrySettings {
    with_telemetry_state_mut(|state| {
        state.settings.debug_logging_enabled = enabled;
        state.settings.clone()
    })
}

pub fn telemetry_snapshot() -> TelemetrySnapshot {
    with_telemetry_state(|state| TelemetrySnapshot {
        settings: state.settings.clone(),
        sampled_event_count: state.sampled_event_count,
        command_metrics: state
            .command_metrics
            .iter()
            .map(|(command, metrics)| CommandMetricSummary {
                command: command.clone(),
                sample_count: metrics.sample_count,
                success_count: metrics.success_count,
                failure_count: metrics.failure_count,
                total_duration_ms: metrics.total_duration_ms,
                average_duration_ms: if metrics.sample_count == 0 {
                    0
                } else {
                    metrics.total_duration_ms / metrics.sample_count as u128
                },
                last_duration_ms: metrics.last_duration_ms,
                last_status: metrics.last_status.clone(),
                last_sample_ts_ms: metrics.last_sample_ts_ms,
            })
            .collect(),
    })
}

pub fn log_command_event(command: &str, status: &str, context: Value) {
    let entry = build_log_entry("INFO", command, status, None, context.clone());
    info!("{}", entry);
    sample_command_event(command, status, &context);
}

pub fn log_command_failure(command: &str, error_payload: ErrorPayload, context: Value) {
    let entry = build_log_entry(
        "ERROR",
        command,
        "failure",
        Some(json!(error_payload)),
        context.clone(),
    );
    error!("{}", entry);
    sample_command_event(command, "failure", &context);
}

pub fn build_log_entry(
    level: &str,
    command: &str,
    status: &str,
    error: Option<Value>,
    context: Value,
) -> String {
    json!({
        "ts_ms": now_timestamp_ms(),
        "level": level,
        "target": "desktop_backend",
        "event": "tauri_command",
        "command": command,
        "status": status,
        "context": context,
        "error": error,
    })
    .to_string()
}

fn sample_command_event(command: &str, status: &str, context: &Value) {
    let should_sample =
        status == "success" || status == "failure" || context.get("duration_ms").is_some();
    if !should_sample {
        return;
    }

    let duration_ms = context
        .get("duration_ms")
        .and_then(Value::as_u64)
        .map(u128::from)
        .unwrap_or_default();
    let sampled_at = now_timestamp_ms();
    let debug_entry =
        with_telemetry_state_mut(|state| {
            if !state.settings.metrics_enabled {
                return None;
            }

            state.sampled_event_count += 1;
            let metrics = state
                .command_metrics
                .entry(command.to_string())
                .or_default();
            metrics.sample_count += 1;
            metrics.total_duration_ms += duration_ms;
            metrics.last_duration_ms = Some(duration_ms);
            metrics.last_status = Some(status.to_string());
            metrics.last_sample_ts_ms = Some(sampled_at);

            if status == "success" {
                metrics.success_count += 1;
            } else {
                metrics.failure_count += 1;
            }

            if state.settings.debug_logging_enabled {
                Some(json!({
                "ts_ms": sampled_at,
                "level": "INFO",
                "target": "desktop_backend",
                "event": "telemetry_metrics_sample",
                "command": command,
                "status": status,
                "sample_count": metrics.sample_count,
                "success_count": metrics.success_count,
                "failure_count": metrics.failure_count,
                "last_duration_ms": duration_ms,
                "average_duration_ms": metrics.total_duration_ms / metrics.sample_count as u128,
            })
            .to_string())
            } else {
                None
            }
        });

    if let Some(entry) = debug_entry {
        info!("{}", entry);
    }
}

fn telemetry_state() -> &'static Mutex<TelemetryState> {
    TELEMETRY_STATE.get_or_init(|| {
        Mutex::new(TelemetryState {
            settings: TelemetrySettings {
                metrics_enabled: read_bool_env(TELEMETRY_METRICS_ENV, true),
                debug_logging_enabled: read_bool_env(TELEMETRY_DEBUG_ENV, false),
            },
            sampled_event_count: 0,
            command_metrics: BTreeMap::new(),
        })
    })
}

fn with_telemetry_state<T>(reader: impl FnOnce(&TelemetryState) -> T) -> T {
    let state = telemetry_state()
        .lock()
        .expect("telemetry state lock should succeed");
    reader(&state)
}

fn with_telemetry_state_mut<T>(writer: impl FnOnce(&mut TelemetryState) -> T) -> T {
    let mut state = telemetry_state()
        .lock()
        .expect("telemetry state lock should succeed");
    writer(&mut state)
}

fn read_bool_env(name: &str, default: bool) -> bool {
    match std::env::var(name) {
        Ok(value) => matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        ),
        Err(_) => default,
    }
}

fn now_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after unix epoch")
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::{
        build_log_entry, sample_command_event, telemetry_snapshot, telemetry_state, ErrorPayload,
        TelemetrySettings,
    };
    use serde_json::json;
    use std::sync::{Mutex, OnceLock};

    #[test]
    fn builds_structured_log_entries() {
        let _guard = test_guard();
        reset_telemetry_state(TelemetrySettings {
            metrics_enabled: true,
            debug_logging_enabled: false,
        });

        let entry = build_log_entry(
            "INFO",
            "load_data_source",
            "success",
            Some(json!(ErrorPayload {
                code: "sample".to_string(),
                message: "Sample".to_string(),
                details: None,
            })),
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

    #[test]
    fn samples_command_metrics_with_duration() {
        let _guard = test_guard();
        reset_telemetry_state(TelemetrySettings {
            metrics_enabled: true,
            debug_logging_enabled: false,
        });

        sample_command_event(
            "execute_query",
            "success",
            &json!({
                "duration_ms": 42,
            }),
        );
        sample_command_event(
            "execute_query",
            "failure",
            &json!({
                "duration_ms": 18,
            }),
        );

        let snapshot = telemetry_snapshot();
        assert_eq!(snapshot.sampled_event_count, 2);
        assert_eq!(snapshot.command_metrics.len(), 1);
        assert_eq!(snapshot.command_metrics[0].command, "execute_query");
        assert_eq!(snapshot.command_metrics[0].sample_count, 2);
        assert_eq!(snapshot.command_metrics[0].success_count, 1);
        assert_eq!(snapshot.command_metrics[0].failure_count, 1);
        assert_eq!(snapshot.command_metrics[0].total_duration_ms, 60);
        assert_eq!(snapshot.command_metrics[0].average_duration_ms, 30);
        assert_eq!(snapshot.command_metrics[0].last_duration_ms, Some(18));
        assert_eq!(
            snapshot.command_metrics[0].last_status.as_deref(),
            Some("failure")
        );
    }

    #[test]
    fn skips_metric_sampling_when_disabled() {
        let _guard = test_guard();
        reset_telemetry_state(TelemetrySettings {
            metrics_enabled: false,
            debug_logging_enabled: true,
        });

        sample_command_event(
            "execute_query",
            "success",
            &json!({
                "duration_ms": 25,
            }),
        );

        let snapshot = telemetry_snapshot();
        assert_eq!(snapshot.sampled_event_count, 0);
        assert!(snapshot.command_metrics.is_empty());
    }

    fn reset_telemetry_state(settings: TelemetrySettings) {
        let mut state = telemetry_state()
            .lock()
            .expect("telemetry state lock should succeed");
        state.settings = settings;
        state.sampled_event_count = 0;
        state.command_metrics.clear();
    }

    fn test_guard() -> std::sync::MutexGuard<'static, ()> {
        static TEST_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        TEST_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .expect("test lock should succeed")
    }
}
