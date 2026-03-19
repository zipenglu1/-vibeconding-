use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::{json, Number, Value};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum QueryEngineError {
    #[error("Data source file does not exist: {0}")]
    FileNotFound(String),
    #[error("Only CSV files are supported right now: {0}")]
    UnsupportedFileType(String),
    #[error("Semantic query must include at least one dimension or measure")]
    EmptySelection,
    #[error("Field not found in data source: {0}")]
    UnknownField(String),
    #[error("Invalid filter value for field {field}: {reason}")]
    InvalidFilterValue { field: String, reason: String },
    #[error("Aggregation {aggregation} requires numeric values for field {field}")]
    InvalidAggregation { field: String, aggregation: String },
    #[error("Unsupported sort field: {0}")]
    InvalidSortField(String),
    #[error("Failed to parse data source: {0}")]
    ParseFailed(String),
    #[error("Failed to execute DuckDB query: {0}")]
    ExecutionFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Dimension {
    pub field: String,
    pub alias: Option<String>,
    pub granularity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Measure {
    pub field: String,
    pub alias: Option<String>,
    pub aggregation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum FilterValue {
    String(String),
    Number(f64),
    Boolean(bool),
    StringArray(Vec<String>),
    NumberArray(Vec<f64>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Filter {
    pub field: String,
    pub operator: String,
    pub value: Option<FilterValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SortOrder {
    pub field: String,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SemanticQuery {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "dataSource")]
    pub data_source: String,
    pub dimensions: Vec<Dimension>,
    pub measures: Vec<Measure>,
    pub filters: Option<Vec<Filter>>,
    pub sort: Option<Vec<SortOrder>>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<BTreeMap<String, Value>>,
    #[serde(rename = "totalRows")]
    pub total_rows: Option<usize>,
    #[serde(rename = "executionTimeMs")]
    pub execution_time_ms: u128,
}

#[derive(Default)]
struct MeasureAccumulator {
    sum: f64,
    count: usize,
    min: Option<f64>,
    max: Option<f64>,
    distinct: HashSet<String>,
}

pub(crate) fn validate_query_fields(
    query: &SemanticQuery,
    headers: &[String],
) -> Result<(), QueryEngineError> {
    for dimension in &query.dimensions {
        ensure_field_exists(headers, &dimension.field)?;
    }

    for measure in &query.measures {
        ensure_field_exists(headers, &measure.field)?;
    }

    if let Some(filters) = &query.filters {
        for filter in filters {
            ensure_field_exists(headers, &filter.field)?;
        }
    }

    Ok(())
}

pub(crate) fn validate_sort_fields(
    columns: &[String],
    sort_orders: &[SortOrder],
) -> Result<(), QueryEngineError> {
    for sort_order in sort_orders {
        if !columns.iter().any(|column| column == &sort_order.field) {
            return Err(QueryEngineError::InvalidSortField(sort_order.field.clone()));
        }
        if !sort_order.direction.eq_ignore_ascii_case("asc")
            && !sort_order.direction.eq_ignore_ascii_case("desc")
        {
            return Err(QueryEngineError::InvalidSortField(sort_order.field.clone()));
        }
    }
    Ok(())
}

pub(crate) fn apply_filters(
    rows: &[HashMap<String, String>],
    filters: Option<&[Filter]>,
) -> Result<Vec<HashMap<String, String>>, QueryEngineError> {
    let Some(filters) = filters else {
        return Ok(rows.to_vec());
    };

    let mut filtered = Vec::new();
    'row_loop: for row in rows {
        for filter in filters {
            let value = row
                .get(&filter.field)
                .map(String::as_str)
                .unwrap_or_default();
            if !matches_filter(value, filter)? {
                continue 'row_loop;
            }
        }
        filtered.push(row.clone());
    }

    Ok(filtered)
}

pub(crate) fn build_result_rows(
    query: &SemanticQuery,
    rows: &[HashMap<String, String>],
) -> Result<Vec<BTreeMap<String, Value>>, QueryEngineError> {
    if query.measures.is_empty() {
        return Ok(rows
            .iter()
            .map(|row| {
                let mut result = BTreeMap::new();
                for dimension in &query.dimensions {
                    result.insert(
                        dimension_output_name(dimension),
                        json!(row_value(row, &dimension.field)),
                    );
                }
                result
            })
            .collect());
    }

    let mut grouped: BTreeMap<Vec<String>, Vec<MeasureAccumulator>> = BTreeMap::new();
    for row in rows {
        let group_key = query
            .dimensions
            .iter()
            .map(|dimension| row_value(row, &dimension.field).to_string())
            .collect::<Vec<_>>();
        let accumulators = grouped.entry(group_key).or_insert_with(|| {
            (0..query.measures.len())
                .map(|_| MeasureAccumulator::default())
                .collect()
        });

        for (index, measure) in query.measures.iter().enumerate() {
            update_accumulator(
                &mut accumulators[index],
                measure,
                row_value(row, &measure.field),
            )?;
        }
    }

    let mut result_rows = Vec::with_capacity(grouped.len());
    for (group_key, accumulators) in grouped {
        let mut result = BTreeMap::new();
        for (index, dimension) in query.dimensions.iter().enumerate() {
            result.insert(dimension_output_name(dimension), json!(group_key[index]));
        }
        for (index, measure) in query.measures.iter().enumerate() {
            result.insert(
                measure_output_name(measure),
                finalize_accumulator(&accumulators[index], measure)?,
            );
        }
        result_rows.push(result);
    }

    if query.dimensions.is_empty() && !query.measures.is_empty() && result_rows.is_empty() {
        let mut result = BTreeMap::new();
        for measure in &query.measures {
            result.insert(measure_output_name(measure), zero_measure_value(measure));
        }
        result_rows.push(result);
    }

    Ok(result_rows)
}

pub(crate) fn sort_result_rows(
    rows: &mut [BTreeMap<String, Value>],
    sort_orders: &[SortOrder],
) -> Result<(), QueryEngineError> {
    for sort_order in sort_orders {
        if !sort_order.direction.eq_ignore_ascii_case("asc")
            && !sort_order.direction.eq_ignore_ascii_case("desc")
        {
            return Err(QueryEngineError::InvalidSortField(sort_order.field.clone()));
        }
    }

    rows.sort_by(|left, right| {
        for sort_order in sort_orders {
            let left_value = left.get(&sort_order.field).unwrap_or(&Value::Null);
            let right_value = right.get(&sort_order.field).unwrap_or(&Value::Null);
            let ordering = compare_json_values(left_value, right_value);
            if ordering != Ordering::Equal {
                return if sort_order.direction.eq_ignore_ascii_case("desc") {
                    ordering.reverse()
                } else {
                    ordering
                };
            }
        }
        Ordering::Equal
    });

    Ok(())
}

pub(crate) fn query_columns(query: &SemanticQuery) -> Vec<String> {
    query
        .dimensions
        .iter()
        .map(dimension_output_name)
        .chain(query.measures.iter().map(measure_output_name))
        .collect()
}

pub(crate) fn dimension_output_name(dimension: &Dimension) -> String {
    dimension
        .alias
        .clone()
        .unwrap_or_else(|| dimension.field.clone())
}

pub(crate) fn measure_output_name(measure: &Measure) -> String {
    measure
        .alias
        .clone()
        .unwrap_or_else(|| format!("{}_{}", measure.aggregation, measure.field))
}

pub(crate) fn filter_string_value(filter: &Filter) -> Result<&str, QueryEngineError> {
    match filter.value.as_ref() {
        Some(FilterValue::String(value)) => Ok(value.as_str()),
        _ => Err(QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: "Expected a string value".to_string(),
        }),
    }
}

pub(crate) fn filter_number_value(filter: &Filter) -> Result<f64, QueryEngineError> {
    match filter.value.as_ref() {
        Some(FilterValue::Number(value)) => Ok(*value),
        _ => Err(QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: "Expected a numeric value".to_string(),
        }),
    }
}

pub(crate) fn number_or_null(value: Option<f64>) -> Value {
    value
        .and_then(Number::from_f64)
        .map(Value::Number)
        .unwrap_or(Value::Null)
}

fn ensure_field_exists(headers: &[String], field: &str) -> Result<(), QueryEngineError> {
    if headers.iter().any(|header| header == field) {
        Ok(())
    } else {
        Err(QueryEngineError::UnknownField(field.to_string()))
    }
}

fn matches_filter(value: &str, filter: &Filter) -> Result<bool, QueryEngineError> {
    match filter.operator.as_str() {
        "eq" => compare_scalar(value, filter, |left, right| left == right),
        "neq" => compare_scalar(value, filter, |left, right| left != right),
        "gt" => compare_numeric(value, filter, |left, right| left > right),
        "gte" => compare_numeric(value, filter, |left, right| left >= right),
        "lt" => compare_numeric(value, filter, |left, right| left < right),
        "lte" => compare_numeric(value, filter, |left, right| left <= right),
        "contains" => {
            let expected = filter_string_value(filter)?;
            Ok(value.contains(expected))
        }
        "in" => matches_in_filter(value, filter, true),
        "not_in" => matches_in_filter(value, filter, false),
        "is_null" => Ok(value.trim().is_empty()),
        "is_not_null" => Ok(!value.trim().is_empty()),
        operator => Err(QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: format!("Unsupported operator: {operator}"),
        }),
    }
}

fn compare_scalar<F>(value: &str, filter: &Filter, comparison: F) -> Result<bool, QueryEngineError>
where
    F: Fn(&str, &str) -> bool,
{
    match filter.value.as_ref() {
        Some(FilterValue::String(expected)) => Ok(comparison(value, expected)),
        Some(FilterValue::Boolean(expected)) => Ok(comparison(
            &value.to_ascii_lowercase(),
            if *expected { "true" } else { "false" },
        )),
        Some(FilterValue::Number(expected)) => {
            let current = parse_number(value, &filter.field)?;
            Ok(comparison(&current.to_string(), &expected.to_string()))
        }
        _ => Err(QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: "Expected a scalar value".to_string(),
        }),
    }
}

fn compare_numeric<F>(value: &str, filter: &Filter, comparison: F) -> Result<bool, QueryEngineError>
where
    F: Fn(f64, f64) -> bool,
{
    let current = parse_number(value, &filter.field)?;
    let expected = filter_number_value(filter)?;
    Ok(comparison(current, expected))
}

fn matches_in_filter(
    value: &str,
    filter: &Filter,
    should_match: bool,
) -> Result<bool, QueryEngineError> {
    let contains = match filter.value.as_ref() {
        Some(FilterValue::StringArray(values)) => values.iter().any(|candidate| candidate == value),
        Some(FilterValue::NumberArray(values)) => {
            let current = parse_number(value, &filter.field)?;
            values
                .iter()
                .any(|candidate| (*candidate - current).abs() < f64::EPSILON)
        }
        _ => {
            return Err(QueryEngineError::InvalidFilterValue {
                field: filter.field.clone(),
                reason: "Expected an array value".to_string(),
            });
        }
    };

    Ok(if should_match { contains } else { !contains })
}

fn update_accumulator(
    accumulator: &mut MeasureAccumulator,
    measure: &Measure,
    raw_value: &str,
) -> Result<(), QueryEngineError> {
    accumulator.count += 1;
    accumulator.distinct.insert(raw_value.to_string());

    match measure.aggregation.as_str() {
        "count" | "count_distinct" => Ok(()),
        "sum" | "avg" | "min" | "max" => {
            let value = parse_measure_number(raw_value, measure)?;
            accumulator.sum += value;
            accumulator.min = Some(match accumulator.min {
                Some(current) => current.min(value),
                None => value,
            });
            accumulator.max = Some(match accumulator.max {
                Some(current) => current.max(value),
                None => value,
            });
            Ok(())
        }
        aggregation => Err(QueryEngineError::InvalidAggregation {
            field: measure.field.clone(),
            aggregation: aggregation.to_string(),
        }),
    }
}

fn finalize_accumulator(
    accumulator: &MeasureAccumulator,
    measure: &Measure,
) -> Result<Value, QueryEngineError> {
    match measure.aggregation.as_str() {
        "sum" => Ok(json!(accumulator.sum)),
        "avg" => Ok(json!(if accumulator.count == 0 {
            0.0
        } else {
            accumulator.sum / accumulator.count as f64
        })),
        "count" => Ok(json!(accumulator.count)),
        "min" => Ok(number_or_null(accumulator.min)),
        "max" => Ok(number_or_null(accumulator.max)),
        "count_distinct" => Ok(json!(accumulator.distinct.len())),
        aggregation => Err(QueryEngineError::InvalidAggregation {
            field: measure.field.clone(),
            aggregation: aggregation.to_string(),
        }),
    }
}

fn zero_measure_value(measure: &Measure) -> Value {
    match measure.aggregation.as_str() {
        "count" | "count_distinct" => json!(0),
        _ => json!(0.0),
    }
}

fn compare_json_values(left: &Value, right: &Value) -> Ordering {
    match (left, right) {
        (Value::Number(left), Value::Number(right)) => compare_f64(
            left.as_f64().unwrap_or_default(),
            right.as_f64().unwrap_or_default(),
        ),
        (Value::String(left), Value::String(right)) => left.cmp(right),
        (Value::Bool(left), Value::Bool(right)) => left.cmp(right),
        _ => left.to_string().cmp(&right.to_string()),
    }
}

fn compare_f64(left: f64, right: f64) -> Ordering {
    left.partial_cmp(&right).unwrap_or(Ordering::Equal)
}

fn row_value<'a>(row: &'a HashMap<String, String>, field: &str) -> &'a str {
    row.get(field).map(String::as_str).unwrap_or_default()
}

fn parse_measure_number(value: &str, measure: &Measure) -> Result<f64, QueryEngineError> {
    value
        .parse::<f64>()
        .map_err(|_| QueryEngineError::InvalidAggregation {
            field: measure.field.clone(),
            aggregation: measure.aggregation.clone(),
        })
}

fn parse_number(value: &str, field: &str) -> Result<f64, QueryEngineError> {
    value
        .parse::<f64>()
        .map_err(|_| QueryEngineError::InvalidFilterValue {
            field: field.to_string(),
            reason: format!("Value {value:?} is not numeric"),
        })
}
