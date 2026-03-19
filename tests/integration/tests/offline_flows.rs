use analytics_core::{Dimension, Measure, QueryEngine, SemanticQuery, SortOrder};
use connectors::DataSourceLoader;
use export_runtime::export_project_snapshot;
use metadata_store::{MetadataStore, ProjectMetadata, StoredDataSource};
use serde_json::json;
use std::fs;
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[test]
fn executes_cached_query_across_workspace_crates() {
    let source_path = unique_temp_file("integration-sales.csv");
    let cache_dir = unique_temp_dir("integration-cache");
    let cache_path = cache_dir.join("sales.parquet");
    fs::write(
        &source_path,
        "order_id,city,region,revenue,status\n1,Hong Kong,APAC,120.5,won\n2,Shenzhen,APAC,200,pending\n3,Hong Kong,APAC,90,won\n4,Berlin,EMEA,150,lost\n5,Shenzhen,APAC,80,won\n",
    )
    .expect("should create csv fixture");

    let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
        .expect("csv should load and cache");

    let query = SemanticQuery {
        id: Some("integration-query".to_string()),
        name: "Revenue by city".to_string(),
        data_source: loaded
            .info
            .cache_path
            .clone()
            .expect("cache path should exist"),
        dimensions: vec![Dimension {
            field: "city".to_string(),
            alias: Some("city".to_string()),
            granularity: None,
        }],
        measures: vec![Measure {
            field: "revenue".to_string(),
            alias: Some("total_revenue".to_string()),
            aggregation: "sum".to_string(),
        }],
        filters: None,
        sort: Some(vec![SortOrder {
            field: "total_revenue".to_string(),
            direction: "desc".to_string(),
        }]),
        limit: None,
        offset: None,
    };

    let result = QueryEngine::execute(&query).expect("query should execute against cache");

    assert_eq!(result.columns, vec!["city", "total_revenue"]);
    assert_eq!(result.total_rows, Some(3));
    assert_eq!(result.rows[0]["city"], json!("Shenzhen"));
    assert_eq!(result.rows[0]["total_revenue"], json!(280.0));

    fs::remove_file(source_path).expect("csv fixture should be removed");
    fs::remove_file(cache_path).expect("cache file should be removed");
    fs::remove_dir(cache_dir).expect("cache dir should be removed");
}

#[test]
fn persists_metadata_and_exports_snapshot_across_workspace_crates() {
    let source_path = unique_temp_file("integration-project.csv");
    let cache_dir = unique_temp_dir("integration-project-cache");
    let cache_path = cache_dir.join("project.parquet");
    let export_path = unique_temp_file("integration-project-export.json");
    fs::write(
        &source_path,
        "city,revenue\nHong Kong,120.5\nShenzhen,200\n",
    )
    .expect("should create csv fixture");

    let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
        .expect("csv should load and cache");

    let metadata = ProjectMetadata {
        id: "integration-project".to_string(),
        name: "Integration Project".to_string(),
        active_data_source_path: Some(loaded.info.path.clone()),
        data_sources: vec![StoredDataSource {
            name: loaded.info.name.clone(),
            data_source_type: loaded.info.data_source_type.clone(),
            path: loaded.info.path.clone(),
            cache_path: loaded.info.cache_path.clone(),
            tables: loaded.info.tables.clone(),
            total_rows: loaded.total_rows,
        }],
        active_dashboard_view_id: None,
        dashboard_views: Vec::new(),
        dashboard_state: None,
    };

    let store = MetadataStore::open_in_memory().expect("in-memory metadata store should open");
    store
        .save_project(&metadata)
        .expect("project metadata should save");

    let restored = store
        .load_project(&metadata.id)
        .expect("project load should succeed")
        .expect("project should exist");

    assert_eq!(restored, metadata);

    export_project_snapshot(
        &export_path,
        "2026-03-15T12:00:00.000Z",
        restored,
        vec![loaded],
    )
    .expect("snapshot export should succeed");

    let written = fs::read_to_string(&export_path).expect("export file should exist");
    let parsed: serde_json::Value =
        serde_json::from_str(&written).expect("export payload should be valid json");

    assert_eq!(parsed["project"]["id"], "integration-project");
    assert_eq!(
        parsed["loaded_data_sources"][0]["info"]["cache_path"],
        json!(cache_path.to_string_lossy().to_string())
    );

    fs::remove_file(source_path).expect("csv fixture should be removed");
    fs::remove_file(cache_path).expect("cache file should be removed");
    fs::remove_dir(cache_dir).expect("cache dir should be removed");
    fs::remove_file(export_path).expect("export file should be removed");
}

#[test]
#[ignore = "performance regression guard; run explicitly from scripts/dev/run-cached-query-perf.ps1"]
fn cached_query_perf_regression_guard() {
    let row_count = read_env_usize("OFFLINE_BI_PERF_ROW_COUNT", 1_000_000);
    let cache_threshold_ms = read_env_u128("OFFLINE_BI_PERF_CACHE_THRESHOLD_MS", 120_000);
    let query_threshold_ms = read_env_u128("OFFLINE_BI_PERF_QUERY_THRESHOLD_MS", 15_000);

    let source_path = unique_temp_file("perf-sales.csv");
    let cache_dir = unique_temp_dir("perf-cache");
    let cache_path = cache_dir.join("perf-sales.parquet");

    write_perf_fixture(&source_path, row_count);

    let cache_started_at = Instant::now();
    let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
        .expect("csv should load and cache");
    let cache_duration_ms = cache_started_at.elapsed().as_millis();

    let query = SemanticQuery {
        id: Some("perf-query".to_string()),
        name: "Revenue by region".to_string(),
        data_source: loaded
            .info
            .cache_path
            .clone()
            .expect("cache path should exist"),
        dimensions: vec![Dimension {
            field: "region".to_string(),
            alias: Some("region".to_string()),
            granularity: None,
        }],
        measures: vec![Measure {
            field: "revenue".to_string(),
            alias: Some("total_revenue".to_string()),
            aggregation: "sum".to_string(),
        }],
        filters: None,
        sort: Some(vec![SortOrder {
            field: "total_revenue".to_string(),
            direction: "desc".to_string(),
        }]),
        limit: None,
        offset: None,
    };

    let query_started_at = Instant::now();
    let result = QueryEngine::execute(&query).expect("query should execute against cache");
    let query_duration_ms = query_started_at.elapsed().as_millis();

    println!(
        "PERF cached_query row_count={row_count} cache_ms={cache_duration_ms} query_ms={query_duration_ms} result_rows={}",
        result.rows.len()
    );

    assert_eq!(loaded.total_rows, row_count);
    assert_eq!(result.columns, vec!["region", "total_revenue"]);
    assert_eq!(result.total_rows, Some(4));
    assert_eq!(result.rows.len(), 4);
    assert!(
        cache_duration_ms <= cache_threshold_ms,
        "cache materialization took {cache_duration_ms} ms which exceeds threshold {cache_threshold_ms} ms"
    );
    assert!(
        query_duration_ms <= query_threshold_ms,
        "cached query execution took {query_duration_ms} ms which exceeds threshold {query_threshold_ms} ms"
    );

    fs::remove_file(source_path).expect("csv fixture should be removed");
    fs::remove_file(cache_path).expect("cache file should be removed");
    fs::remove_dir(cache_dir).expect("cache dir should be removed");
}

fn unique_temp_file(file_name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("{}-{file_name}", unique_suffix()))
}

fn unique_temp_dir(label: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("{}-{label}", unique_suffix()));
    if Path::new(&path).exists() {
        fs::remove_dir_all(&path).expect("stale temp dir should be removable");
    }
    fs::create_dir_all(&path).expect("temp dir should be creatable");
    path
}

fn unique_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock should be after epoch")
        .as_nanos()
}

fn read_env_usize(name: &str, default: usize) -> usize {
    std::env::var(name)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(default)
}

fn read_env_u128(name: &str, default: u128) -> u128 {
    std::env::var(name)
        .ok()
        .and_then(|value| value.parse::<u128>().ok())
        .unwrap_or(default)
}

fn write_perf_fixture(path: &Path, row_count: usize) {
    let file = fs::File::create(path).expect("performance fixture file should be creatable");
    let mut writer = BufWriter::new(file);
    writeln!(writer, "order_id,city,region,revenue,status").expect("header should write");

    let cities = [
        ("Hong Kong", "APAC"),
        ("Shenzhen", "APAC"),
        ("Berlin", "EMEA"),
        ("Paris", "EMEA"),
        ("New York", "AMER"),
        ("Toronto", "AMER"),
        ("Sydney", "ANZ"),
        ("Melbourne", "ANZ"),
    ];
    let statuses = ["won", "pending", "lost", "won"];

    for index in 0..row_count {
        let (city, region) = cities[index % cities.len()];
        let status = statuses[index % statuses.len()];
        let revenue = 100 + ((index % 500) as u64);
        writeln!(
            writer,
            "{},{},{},{},{}",
            index + 1,
            city,
            region,
            revenue,
            status
        )
        .expect("row should write");
    }

    writer.flush().expect("fixture should flush");
}
