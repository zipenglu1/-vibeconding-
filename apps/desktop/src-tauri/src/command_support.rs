use crate::AppError;
use analytics_core::{
    ChartSpec, ChartSpecBuilder, FieldProfile, QuerySuggestion, SemanticQuery, SuggestionEngine,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRecommendation {
    pub suggestion: QuerySuggestion,
    pub chart_spec: Option<ChartSpec>,
}

pub fn suggest_query_configurations_support(
    fields: Vec<FieldProfile>,
) -> Result<Vec<QueryRecommendation>, AppError> {
    Ok(SuggestionEngine::suggest_queries(&fields)
        .into_iter()
        .map(|suggestion| QueryRecommendation {
            chart_spec: Some(ChartSpecBuilder::from_suggestion(&suggestion)),
            suggestion,
        })
        .collect())
}

pub fn generate_chart_spec_support(
    query: SemanticQuery,
    chart_type: &str,
) -> Result<ChartSpec, AppError> {
    ChartSpecBuilder::from_query(&query, chart_type)
        .ok_or_else(|| AppError::query_execution("Chart spec requires at least one measure."))
}

pub fn resolve_cache_warmup_target(
    data_source_path: &str,
    cache_path: Option<&str>,
    data_source_type: &str,
) -> Result<(String, bool, String), AppError> {
    if data_source_path.trim().is_empty() {
        return Err(AppError::data_source_invalid(
            "A data source path is required before warming the cache.",
        ));
    }

    let normalized_type = data_source_type.trim().to_ascii_lowercase();
    let uses_cached_artifact = cache_path.is_some_and(|path| !path.trim().is_empty());
    if !uses_cached_artifact && normalized_type != "parquet" {
        return Err(AppError::data_source_invalid(
            "Only Parquet data sources or sources with a cached Parquet artifact can be warmed.",
        ));
    }

    let warmup_path = cache_path
        .filter(|path| !path.trim().is_empty())
        .unwrap_or(data_source_path)
        .to_string();

    Ok((warmup_path, uses_cached_artifact, normalized_type))
}

pub fn resolve_profiling_target(
    data_source_path: &str,
    cache_path: Option<&str>,
    data_source_type: &str,
) -> Result<String, AppError> {
    let (resolved_path, _, _) =
        resolve_cache_warmup_target(data_source_path, cache_path, data_source_type)?;
    Ok(resolved_path)
}

#[cfg(test)]
mod tests {
    use super::{
        generate_chart_spec_support, resolve_cache_warmup_target, resolve_profiling_target,
        suggest_query_configurations_support, QueryRecommendation,
    };
    use crate::AppError;
    use analytics_core::{Dimension, FieldProfile, Measure, SemanticQuery};

    #[test]
    fn suggests_backend_recommendations_with_chart_specs() {
        let recommendations = suggest_query_configurations_support(vec![
            FieldProfile {
                name: "order_date".to_string(),
                data_type: "date".to_string(),
            },
            FieldProfile {
                name: "region".to_string(),
                data_type: "string".to_string(),
            },
            FieldProfile {
                name: "revenue".to_string(),
                data_type: "number".to_string(),
            },
        ])
        .expect("recommendations should be generated");

        assert!(!recommendations.is_empty());
        assert!(recommendations.iter().all(has_chart_spec));
        assert_eq!(
            recommendations[0]
                .chart_spec
                .as_ref()
                .expect("chart spec should exist")
                .chart_type,
            recommendations[0].suggestion.chart_hint
        );
    }

    #[test]
    fn returns_empty_recommendations_for_empty_field_list() {
        let recommendations = suggest_query_configurations_support(Vec::new())
            .expect("empty field lists should succeed");

        assert!(recommendations.is_empty());
    }

    #[test]
    fn generates_chart_spec_for_query_command() {
        let query = sample_query_with_measure();

        let chart_spec =
            generate_chart_spec_support(query, "bar").expect("chart spec should be generated");

        assert_eq!(chart_spec.title, "Revenue by region");
        assert_eq!(chart_spec.chart_type, "bar");
        assert_eq!(
            chart_spec
                .category_axis
                .as_ref()
                .expect("category axis should exist")
                .field,
            "region"
        );
        assert_eq!(chart_spec.series.len(), 1);
        assert_eq!(chart_spec.series[0].field, "revenue");
        assert_eq!(chart_spec.series[0].aggregation, "sum");
    }

    #[test]
    fn rejects_chart_spec_generation_when_query_has_no_measures() {
        let mut query = sample_query_with_measure();
        query.measures.clear();

        let error = generate_chart_spec_support(query, "bar")
            .expect_err("chart spec generation should fail");

        assert_eq!(error.code, "query_execution_error");
        assert_eq!(error.message, "The query could not be executed.");
        assert_eq!(
            error.details.as_deref(),
            Some("Chart spec requires at least one measure.")
        );
    }

    #[test]
    fn rejects_cache_warmup_for_non_parquet_sources_without_cache() {
        let error = resolve_cache_warmup_target("orders.csv", None, "csv")
            .expect_err("non-parquet sources without cache should be rejected");

        assert_eq!(
            error,
            AppError::data_source_invalid(
                "Only Parquet data sources or sources with a cached Parquet artifact can be warmed.",
            )
        );
    }

    #[test]
    fn resolves_cache_warmup_to_direct_parquet_path() {
        let (warmup_path, uses_cached_artifact, normalized_type) =
            resolve_cache_warmup_target("workspace/cache/source.parquet", None, "parquet")
                .expect("parquet warmup target should resolve");

        assert_eq!(warmup_path, "workspace/cache/source.parquet");
        assert!(!uses_cached_artifact);
        assert_eq!(normalized_type, "parquet");
    }

    #[test]
    fn resolves_profile_target_to_cached_parquet_path() {
        let resolved =
            resolve_profiling_target("orders.csv", Some("workspace/cache/orders.parquet"), "csv")
                .expect("profiling should use cache path");

        assert_eq!(resolved, "workspace/cache/orders.parquet");
    }

    fn has_chart_spec(recommendation: &QueryRecommendation) -> bool {
        recommendation.chart_spec.is_some()
    }

    fn sample_query_with_measure() -> SemanticQuery {
        SemanticQuery {
            id: Some("query-001".to_string()),
            name: "Revenue by region".to_string(),
            data_source: "workspace/cache/sales.parquet".to_string(),
            dimensions: vec![Dimension {
                field: "region".to_string(),
                alias: Some("Region".to_string()),
                granularity: None,
            }],
            measures: vec![Measure {
                field: "revenue".to_string(),
                alias: Some("total_revenue".to_string()),
                aggregation: "sum".to_string(),
            }],
            filters: None,
            sort: None,
            limit: Some(20),
            offset: Some(0),
        }
    }
}
