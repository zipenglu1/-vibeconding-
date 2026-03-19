pub mod chart_specs;
pub mod dataset_io;
pub mod duckdb_sql;
pub mod executor;
pub mod planner;
pub mod profiling;
pub mod semantic;
pub mod suggestions;

use std::time::Instant;

pub use chart_specs::{ChartAxis, ChartSeriesSpec, ChartSpec, ChartSpecBuilder};
use dataset_io::{detect_query_path_kind, QueryPathKind};
use executor::{execute_csv_query, execute_parquet_query};
pub use profiling::{
    profile_parquet_data_source, verify_analytics_stack, AnalyticsStackStatus, DataSourceProfile,
    ProfiledFieldSummary,
};
pub use semantic::{
    Dimension, Filter, FilterValue, Measure, QueryEngineError, QueryResult, SemanticQuery,
    SortOrder,
};
pub use suggestions::{FieldProfile, QuerySuggestion, SuggestionEngine};

pub struct QueryEngine;

impl QueryEngine {
    pub fn execute(query: &SemanticQuery) -> Result<QueryResult, QueryEngineError> {
        let started_at = Instant::now();

        if query.dimensions.is_empty() && query.measures.is_empty() {
            return Err(QueryEngineError::EmptySelection);
        }

        let (columns, rows, total_rows) = match detect_query_path_kind(&query.data_source)? {
            QueryPathKind::Csv => execute_csv_query(query)?,
            QueryPathKind::Parquet => execute_parquet_query(query)?,
        };

        Ok(QueryResult {
            columns,
            rows,
            total_rows: Some(total_rows),
            execution_time_ms: started_at.elapsed().as_millis(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        profile_parquet_data_source, verify_analytics_stack, Dimension, Filter, FilterValue,
        Measure, QueryEngine, QueryEngineError, SemanticQuery, SortOrder,
    };
    use connectors::DataSourceLoader;
    use serde_json::json;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn executes_grouped_semantic_query() {
        let path = write_query_fixture();
        let query = SemanticQuery {
            id: Some("query-001".to_string()),
            name: "Revenue by city".to_string(),
            data_source: path.display().to_string(),
            dimensions: vec![Dimension {
                field: "city".to_string(),
                alias: Some("city".to_string()),
                granularity: None,
            }],
            measures: vec![
                Measure {
                    field: "revenue".to_string(),
                    alias: Some("total_revenue".to_string()),
                    aggregation: "sum".to_string(),
                },
                Measure {
                    field: "order_id".to_string(),
                    alias: Some("orders".to_string()),
                    aggregation: "count".to_string(),
                },
            ],
            filters: Some(vec![Filter {
                field: "region".to_string(),
                operator: "eq".to_string(),
                value: Some(FilterValue::String("APAC".to_string())),
            }]),
            sort: Some(vec![SortOrder {
                field: "total_revenue".to_string(),
                direction: "desc".to_string(),
            }]),
            limit: None,
            offset: None,
        };

        let result = QueryEngine::execute(&query).expect("query should execute");

        assert_eq!(result.columns, vec!["city", "total_revenue", "orders"]);
        assert_eq!(result.total_rows, Some(2));
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.rows[0]["city"], json!("Shenzhen"));
        assert_eq!(result.rows[0]["total_revenue"], json!(280.0));
        assert_eq!(result.rows[0]["orders"], json!(2));

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn executes_measure_only_query_with_pagination() {
        let path = write_query_fixture();
        let query = SemanticQuery {
            id: None,
            name: "Average revenue".to_string(),
            data_source: path.display().to_string(),
            dimensions: vec![],
            measures: vec![Measure {
                field: "revenue".to_string(),
                alias: Some("avg_revenue".to_string()),
                aggregation: "avg".to_string(),
            }],
            filters: Some(vec![Filter {
                field: "status".to_string(),
                operator: "in".to_string(),
                value: Some(FilterValue::StringArray(vec![
                    "won".to_string(),
                    "pending".to_string(),
                ])),
            }]),
            sort: None,
            limit: Some(1),
            offset: Some(0),
        };

        let result = QueryEngine::execute(&query).expect("query should execute");

        assert_eq!(result.total_rows, Some(1));
        assert_eq!(result.rows[0]["avg_revenue"], json!(122.625));

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn rejects_unknown_fields() {
        let path = write_query_fixture();
        let query = SemanticQuery {
            id: None,
            name: "Broken query".to_string(),
            data_source: path.display().to_string(),
            dimensions: vec![Dimension {
                field: "missing_field".to_string(),
                alias: None,
                granularity: None,
            }],
            measures: vec![],
            filters: None,
            sort: None,
            limit: None,
            offset: None,
        };

        let error = QueryEngine::execute(&query).expect_err("query should fail");
        assert!(matches!(error, QueryEngineError::UnknownField(field) if field == "missing_field"));

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn rejects_invalid_numeric_filter_values() {
        let path = write_query_fixture();
        let query = SemanticQuery {
            id: None,
            name: "Broken filter".to_string(),
            data_source: path.display().to_string(),
            dimensions: vec![Dimension {
                field: "city".to_string(),
                alias: None,
                granularity: None,
            }],
            measures: vec![],
            filters: Some(vec![Filter {
                field: "revenue".to_string(),
                operator: "gt".to_string(),
                value: Some(FilterValue::String("high".to_string())),
            }]),
            sort: None,
            limit: None,
            offset: None,
        };

        let error =
            QueryEngine::execute(&query).expect_err("query should reject invalid filter value");

        assert!(matches!(
            error,
            QueryEngineError::InvalidFilterValue { field, .. } if field == "revenue"
        ));

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn rejects_invalid_sort_direction() {
        let path = write_query_fixture();
        let query = SemanticQuery {
            id: None,
            name: "Broken sort".to_string(),
            data_source: path.display().to_string(),
            dimensions: vec![Dimension {
                field: "city".to_string(),
                alias: Some("city".to_string()),
                granularity: None,
            }],
            measures: vec![],
            filters: None,
            sort: Some(vec![SortOrder {
                field: "city".to_string(),
                direction: "sideways".to_string(),
            }]),
            limit: None,
            offset: None,
        };

        let error =
            QueryEngine::execute(&query).expect_err("query should reject invalid sort direction");

        assert!(matches!(error, QueryEngineError::InvalidSortField(field) if field == "city"));

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn verifies_duckdb_stack() {
        let status = verify_analytics_stack().expect("analytics stack should initialize");

        assert!(!status.duckdb_version.trim().is_empty());
        assert_eq!(status.smoke_row_count, 2);
    }

    #[test]
    fn executes_grouped_semantic_query_against_parquet_cache() {
        let source_path = write_query_fixture();
        let cache_path = unique_temp_dir("query-engine-cache").join("query-engine.parquet");
        let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
            .expect("csv should cache to parquet");
        let query = SemanticQuery {
            id: Some("query-002".to_string()),
            name: "Revenue by city parquet".to_string(),
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
            filters: Some(vec![Filter {
                field: "region".to_string(),
                operator: "eq".to_string(),
                value: Some(FilterValue::String("APAC".to_string())),
            }]),
            sort: Some(vec![SortOrder {
                field: "total_revenue".to_string(),
                direction: "desc".to_string(),
            }]),
            limit: None,
            offset: None,
        };

        let result = QueryEngine::execute(&query).expect("parquet query should execute");

        assert_eq!(result.columns, vec!["city", "total_revenue"]);
        assert_eq!(result.total_rows, Some(2));
        assert_eq!(result.rows[0]["city"], json!("Shenzhen"));
        assert_eq!(result.rows[0]["total_revenue"], json!(280.0));

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
    }

    #[test]
    fn executes_measure_only_parquet_query_with_count_distinct_and_pagination_metadata() {
        let source_path = write_query_fixture();
        let cache_path = unique_temp_dir("query-engine-count-cache").join("query-engine.parquet");
        let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
            .expect("csv should cache to parquet");
        let query = SemanticQuery {
            id: Some("query-003".to_string()),
            name: "Distinct cities parquet".to_string(),
            data_source: loaded
                .info
                .cache_path
                .clone()
                .expect("cache path should exist"),
            dimensions: vec![],
            measures: vec![Measure {
                field: "city".to_string(),
                alias: Some("distinct_cities".to_string()),
                aggregation: "count_distinct".to_string(),
            }],
            filters: Some(vec![Filter {
                field: "status".to_string(),
                operator: "not_in".to_string(),
                value: Some(FilterValue::StringArray(vec!["lost".to_string()])),
            }]),
            sort: None,
            limit: Some(1),
            offset: Some(0),
        };

        let result = QueryEngine::execute(&query).expect("parquet measure query should execute");

        assert_eq!(result.columns, vec!["distinct_cities"]);
        assert_eq!(result.total_rows, Some(1));
        assert_eq!(result.rows.len(), 1);
        assert_eq!(result.rows[0]["distinct_cities"], json!(2));

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
    }

    #[test]
    fn executes_dimension_only_parquet_query_with_sort_and_pagination() {
        let source_path = write_query_fixture();
        let cache_path =
            unique_temp_dir("query-engine-dimension-cache").join("query-engine.parquet");
        let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
            .expect("csv should cache to parquet");
        let query = SemanticQuery {
            id: Some("query-004".to_string()),
            name: "Cities parquet page".to_string(),
            data_source: loaded
                .info
                .cache_path
                .clone()
                .expect("cache path should exist"),
            dimensions: vec![Dimension {
                field: "city".to_string(),
                alias: Some("city_name".to_string()),
                granularity: None,
            }],
            measures: vec![],
            filters: Some(vec![Filter {
                field: "region".to_string(),
                operator: "eq".to_string(),
                value: Some(FilterValue::String("APAC".to_string())),
            }]),
            sort: Some(vec![SortOrder {
                field: "city_name".to_string(),
                direction: "asc".to_string(),
            }]),
            limit: Some(2),
            offset: Some(1),
        };

        let result = QueryEngine::execute(&query).expect("parquet dimension query should execute");

        assert_eq!(result.columns, vec!["city_name"]);
        assert_eq!(result.total_rows, Some(4));
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.rows[0]["city_name"], json!("Hong Kong"));
        assert_eq!(result.rows[1]["city_name"], json!("Shenzhen"));

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
    }

    #[test]
    fn profiles_parquet_data_source_through_duckdb() {
        let source_path = write_query_fixture();
        let cache_path = unique_temp_dir("query-engine-profile-cache").join("query-engine.parquet");
        let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
            .expect("csv should cache to parquet");

        let profile = profile_parquet_data_source(
            loaded
                .info
                .cache_path
                .as_deref()
                .expect("cache path should exist"),
        )
        .expect("profiling should succeed");

        assert_eq!(profile.row_count, 5);
        assert_eq!(profile.field_count, 5);
        assert!(profile.fields.iter().any(|field| {
            field.name == "city"
                && field.distinct_count == 3
                && field
                    .sample_values
                    .iter()
                    .any(|value| value.contains("Hong Kong"))
        }));

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
    }

    fn write_query_fixture() -> PathBuf {
        let path = unique_temp_file("query-engine.csv");
        fs::write(
            &path,
            "order_id,city,region,revenue,status\n1,Hong Kong,APAC,120.5,won\n2,Shenzhen,APAC,200,pending\n3,Hong Kong,APAC,90,won\n4,Berlin,EMEA,150,lost\n5,Shenzhen,APAC,80,won\n",
        )
        .expect("should create csv fixture");
        path
    }

    fn unique_temp_file(file_name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("{suffix}-{file_name}"))
    }

    fn unique_temp_dir(dir_name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("{suffix}-{dir_name}"));
        if Path::new(&path).exists() {
            fs::remove_dir_all(&path).expect("stale temp dir should be removable");
        }
        fs::create_dir_all(&path).expect("temp dir should be creatable");
        path
    }
}
