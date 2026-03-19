use serde::{Deserialize, Serialize};

use crate::{QuerySuggestion, SemanticQuery};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChartAxis {
    pub field: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChartSeriesSpec {
    pub field: String,
    pub label: String,
    pub aggregation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChartSpec {
    pub title: String,
    pub chart_type: String,
    pub category_axis: Option<ChartAxis>,
    pub value_axis: Option<ChartAxis>,
    pub series: Vec<ChartSeriesSpec>,
}

pub struct ChartSpecBuilder;

impl ChartSpecBuilder {
    pub fn from_query(query: &SemanticQuery, chart_type: &str) -> Option<ChartSpec> {
        if query.measures.is_empty() {
            return None;
        }

        let category_axis = query.dimensions.first().map(|dimension| ChartAxis {
            field: dimension.field.clone(),
            label: dimension
                .alias
                .clone()
                .unwrap_or_else(|| dimension.field.clone()),
        });
        let primary_measure = query.measures.first()?;
        let value_axis = Some(ChartAxis {
            field: primary_measure.field.clone(),
            label: primary_measure.alias.clone().unwrap_or_else(|| {
                default_measure_label(&primary_measure.aggregation, &primary_measure.field)
            }),
        });
        let series = query
            .measures
            .iter()
            .map(|measure| ChartSeriesSpec {
                field: measure.field.clone(),
                label: measure
                    .alias
                    .clone()
                    .unwrap_or_else(|| default_measure_label(&measure.aggregation, &measure.field)),
                aggregation: measure.aggregation.clone(),
            })
            .collect::<Vec<_>>();

        Some(ChartSpec {
            title: query.name.clone(),
            chart_type: chart_type.to_string(),
            category_axis,
            value_axis,
            series,
        })
    }

    pub fn from_suggestion(suggestion: &QuerySuggestion) -> ChartSpec {
        let category_axis = suggestion.dimension_field.as_ref().map(|field| ChartAxis {
            field: field.clone(),
            label: field.clone(),
        });
        let value_axis = Some(ChartAxis {
            field: suggestion.measure_field.clone(),
            label: suggestion.measure_field.clone(),
        });

        ChartSpec {
            title: suggestion.title.clone(),
            chart_type: suggestion.chart_hint.clone(),
            category_axis,
            value_axis,
            series: vec![ChartSeriesSpec {
                field: suggestion.measure_field.clone(),
                label: suggestion.measure_field.clone(),
                aggregation: suggestion.aggregation.clone(),
            }],
        }
    }
}

fn default_measure_label(aggregation: &str, field: &str) -> String {
    format!("{aggregation}_{field}")
}

#[cfg(test)]
mod tests {
    use super::ChartSpecBuilder;
    use crate::{Dimension, Measure, QuerySuggestion, SemanticQuery};

    #[test]
    fn builds_bar_chart_spec_from_semantic_query() {
        let query = SemanticQuery {
            id: None,
            name: "Revenue by region".to_string(),
            data_source: "dataset.parquet".to_string(),
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
            limit: None,
            offset: None,
        };

        let spec = ChartSpecBuilder::from_query(&query, "bar").expect("spec should be built");

        assert_eq!(spec.title, "Revenue by region");
        assert_eq!(spec.chart_type, "bar");
        assert_eq!(spec.category_axis.expect("category axis").field, "region");
        assert_eq!(spec.value_axis.expect("value axis").label, "total_revenue");
        assert_eq!(spec.series.len(), 1);
        assert_eq!(spec.series[0].aggregation, "sum");
    }

    #[test]
    fn returns_none_when_query_has_no_measures() {
        let query = SemanticQuery {
            id: None,
            name: "Dimension only".to_string(),
            data_source: "dataset.parquet".to_string(),
            dimensions: vec![Dimension {
                field: "region".to_string(),
                alias: None,
                granularity: None,
            }],
            measures: vec![],
            filters: None,
            sort: None,
            limit: None,
            offset: None,
        };

        assert!(ChartSpecBuilder::from_query(&query, "bar").is_none());
    }

    #[test]
    fn builds_chart_spec_from_query_suggestion() {
        let suggestion = QuerySuggestion {
            title: "Revenue trend".to_string(),
            dimension_field: Some("order_date".to_string()),
            measure_field: "revenue".to_string(),
            aggregation: "sum".to_string(),
            chart_hint: "line".to_string(),
            reason: "Detected a temporal field.".to_string(),
        };

        let spec = ChartSpecBuilder::from_suggestion(&suggestion);

        assert_eq!(spec.title, "Revenue trend");
        assert_eq!(spec.chart_type, "line");
        assert_eq!(
            spec.category_axis.expect("category axis").field,
            "order_date"
        );
        assert_eq!(spec.series[0].field, "revenue");
    }
}
