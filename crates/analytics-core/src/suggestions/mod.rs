use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FieldProfile {
    pub name: String,
    #[serde(rename = "data_type")]
    pub data_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuerySuggestion {
    pub title: String,
    pub dimension_field: Option<String>,
    pub measure_field: String,
    pub aggregation: String,
    pub chart_hint: String,
    pub reason: String,
}

pub struct SuggestionEngine;

impl SuggestionEngine {
    pub fn suggest_queries(fields: &[FieldProfile]) -> Vec<QuerySuggestion> {
        let numeric_fields = fields
            .iter()
            .filter(|field| is_numeric_type(&field.data_type))
            .collect::<Vec<_>>();
        let temporal_fields = fields
            .iter()
            .filter(|field| is_temporal_field(field))
            .collect::<Vec<_>>();
        let categorical_fields = fields
            .iter()
            .filter(|field| !is_numeric_type(&field.data_type) && !is_temporal_field(field))
            .collect::<Vec<_>>();

        let mut suggestions = Vec::new();

        if let (Some(dimension), Some(measure)) = (temporal_fields.first(), numeric_fields.first())
        {
            suggestions.push(QuerySuggestion {
                title: format!("{} trend", humanize_field_name(&measure.name)),
                dimension_field: Some(dimension.name.clone()),
                measure_field: measure.name.clone(),
                aggregation: "sum".to_string(),
                chart_hint: "line".to_string(),
                reason: format!(
                    "Detected temporal field '{}' and numeric field '{}'.",
                    dimension.name, measure.name
                ),
            });
        }

        if let (Some(dimension), Some(measure)) =
            (categorical_fields.first(), numeric_fields.first())
        {
            suggestions.push(QuerySuggestion {
                title: format!(
                    "{} by {}",
                    humanize_field_name(&measure.name),
                    humanize_field_name(&dimension.name)
                ),
                dimension_field: Some(dimension.name.clone()),
                measure_field: measure.name.clone(),
                aggregation: "sum".to_string(),
                chart_hint: "bar".to_string(),
                reason: format!(
                    "Detected categorical field '{}' and numeric field '{}'.",
                    dimension.name, measure.name
                ),
            });
        }

        if let Some(measure) = numeric_fields.first() {
            suggestions.push(QuerySuggestion {
                title: format!("Average {}", humanize_field_name(&measure.name)),
                dimension_field: None,
                measure_field: measure.name.clone(),
                aggregation: "avg".to_string(),
                chart_hint: "single_value".to_string(),
                reason: format!("Fallback numeric summary for field '{}'.", measure.name),
            });
        }

        suggestions.dedup_by(|left, right| {
            left.dimension_field == right.dimension_field
                && left.measure_field == right.measure_field
                && left.aggregation == right.aggregation
        });

        suggestions
    }
}

fn is_numeric_type(data_type: &str) -> bool {
    matches!(
        data_type.to_ascii_lowercase().as_str(),
        "integer" | "number" | "float" | "double" | "decimal" | "int" | "bigint"
    )
}

fn is_temporal_field(field: &FieldProfile) -> bool {
    let data_type = field.data_type.to_ascii_lowercase();
    let name = field.name.to_ascii_lowercase();

    matches!(data_type.as_str(), "date" | "datetime" | "timestamp")
        || name.contains("date")
        || name.contains("time")
        || name.ends_with("_at")
}

fn humanize_field_name(field: &str) -> String {
    field
        .split('_')
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!(
                    "{}{}",
                    first.to_ascii_uppercase(),
                    chars.as_str().to_ascii_lowercase()
                ),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::{FieldProfile, SuggestionEngine};

    #[test]
    fn suggests_trend_for_temporal_and_numeric_fields() {
        let suggestions = SuggestionEngine::suggest_queries(&[
            FieldProfile {
                name: "order_date".to_string(),
                data_type: "string".to_string(),
            },
            FieldProfile {
                name: "revenue".to_string(),
                data_type: "number".to_string(),
            },
        ]);

        assert_eq!(suggestions[0].title, "Revenue trend");
        assert_eq!(
            suggestions[0].dimension_field.as_deref(),
            Some("order_date")
        );
        assert_eq!(suggestions[0].measure_field, "revenue");
        assert_eq!(suggestions[0].chart_hint, "line");
    }

    #[test]
    fn suggests_breakdown_for_categorical_and_numeric_fields() {
        let suggestions = SuggestionEngine::suggest_queries(&[
            FieldProfile {
                name: "region".to_string(),
                data_type: "string".to_string(),
            },
            FieldProfile {
                name: "revenue".to_string(),
                data_type: "number".to_string(),
            },
        ]);

        assert!(suggestions.iter().any(|suggestion| {
            suggestion.dimension_field.as_deref() == Some("region")
                && suggestion.measure_field == "revenue"
                && suggestion.chart_hint == "bar"
        }));
    }

    #[test]
    fn falls_back_to_numeric_summary_when_only_numeric_fields_exist() {
        let suggestions = SuggestionEngine::suggest_queries(&[FieldProfile {
            name: "revenue".to_string(),
            data_type: "number".to_string(),
        }]);

        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].dimension_field, None);
        assert_eq!(suggestions[0].aggregation, "avg");
        assert_eq!(suggestions[0].chart_hint, "single_value");
    }
}
