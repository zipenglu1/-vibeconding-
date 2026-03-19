use std::collections::BTreeMap;

use duckdb::{
    params_from_iter,
    types::{Value as DuckValue, ValueRef},
    Connection,
};
use serde_json::{json, Value};

use crate::dataset_io::load_query_dataset;
use crate::duckdb_sql::{
    render_query, ComparisonOperator, DuckDbQuery, Expression, OrderBy, Predicate, QuerySource,
    SelectItem, SelectQuery, ValueExpression,
};
use crate::planner::{
    build_parquet_query_plan, PlannedAggregation, PlannedMeasure, PlannedParquetQuery,
};
use crate::semantic::{
    apply_filters, build_result_rows, number_or_null, query_columns, sort_result_rows,
    validate_query_fields, QueryEngineError, SemanticQuery,
};

pub(crate) fn execute_csv_query(
    query: &SemanticQuery,
) -> Result<(Vec<String>, Vec<BTreeMap<String, Value>>, usize), QueryEngineError> {
    let dataset = load_query_dataset(&query.data_source)?;
    validate_query_fields(query, &dataset.headers)?;

    let filtered_rows = apply_filters(&dataset.rows, query.filters.as_deref())?;
    let mut result_rows = build_result_rows(query, &filtered_rows)?;
    let total_rows = result_rows.len();

    if let Some(sort_orders) = &query.sort {
        sort_result_rows(&mut result_rows, sort_orders)?;
    }

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(total_rows.saturating_sub(offset));
    let rows = result_rows
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect::<Vec<_>>();

    Ok((query_columns(query), rows, total_rows))
}

pub(crate) fn execute_parquet_query(
    query: &SemanticQuery,
) -> Result<(Vec<String>, Vec<BTreeMap<String, Value>>, usize), QueryEngineError> {
    let headers = parquet_headers_via_duckdb(&query.data_source)?;
    validate_query_fields(query, &headers)?;

    let planned = build_parquet_query_plan(query)?;
    let rendered = render_duckdb_query(&planned)?;
    let connection = Connection::open_in_memory()
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;

    let total_rows = connection
        .query_row(
            &rendered.count_sql,
            params_from_iter(rendered.base_params.iter()),
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?
        .max(0) as usize;

    let mut statement = connection
        .prepare(&rendered.main_sql)
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let mut rows = statement
        .query(params_from_iter(rendered.main_params.iter()))
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let mut result_rows = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?
    {
        let mut result_row = BTreeMap::new();
        for (index, column_name) in rendered.output_columns.iter().enumerate() {
            let value = row
                .get_ref(index)
                .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
            result_row.insert(column_name.clone(), duckdb_value_to_json(value));
        }
        result_rows.push(result_row);
    }

    Ok((rendered.output_columns, result_rows, total_rows))
}

struct RenderedDuckDbQuery {
    main_sql: String,
    count_sql: String,
    output_columns: Vec<String>,
    base_params: Vec<DuckValue>,
    main_params: Vec<DuckValue>,
}

fn parquet_headers_via_duckdb(path: &str) -> Result<Vec<String>, QueryEngineError> {
    let connection = Connection::open_in_memory()
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let mut statement = connection
        .prepare("SELECT * FROM read_parquet(?) LIMIT 0")
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let arrow = statement
        .query_arrow([path])
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;

    Ok(arrow
        .get_schema()
        .fields()
        .iter()
        .map(|field| field.name().to_string())
        .collect::<Vec<_>>())
}

fn render_duckdb_query(
    planned: &PlannedParquetQuery,
) -> Result<RenderedDuckDbQuery, QueryEngineError> {
    let mut base_params = vec![DuckValue::from(planned.data_source.clone())];
    let output_columns = planned
        .dimensions
        .iter()
        .map(|dimension| dimension.output_name.clone())
        .chain(
            planned
                .measures
                .iter()
                .map(|measure| measure.output_name.clone()),
        )
        .collect::<Vec<_>>();
    let base_query = build_base_query(planned, &mut base_params)?;
    let mut main_query = SelectQuery {
        distinct: false,
        projection: vec![SelectItem {
            expression: Expression::Wildcard,
            alias: None,
        }],
        source: QuerySource::Subquery {
            query: Box::new(base_query.clone()),
            alias: "result".to_string(),
        },
        filters: Vec::new(),
        group_by: Vec::new(),
        order_by: planned
            .sort_orders
            .iter()
            .map(|sort_order| OrderBy {
                expression: Expression::Identifier(sort_order.field.clone()),
                descending: sort_order.direction.eq_ignore_ascii_case("desc"),
            })
            .collect::<Vec<_>>(),
        limit: None,
        offset: None,
    };
    let mut main_params = base_params.clone();
    if planned.limit != usize::MAX {
        main_query.limit = Some(ValueExpression::Parameter);
        main_params.push(DuckValue::from(planned.limit as u64));
    }
    if planned.offset > 0 {
        if planned.limit == usize::MAX {
            main_query.limit = Some(ValueExpression::Parameter);
            main_params.push(DuckValue::from(i64::MAX));
        }
        main_query.offset = Some(ValueExpression::Parameter);
        main_params.push(DuckValue::from(planned.offset as u64));
    }
    let count_query = DuckDbQuery::CountRows {
        source: Box::new(base_query),
        alias: "counted".to_string(),
    };

    Ok(RenderedDuckDbQuery {
        main_sql: render_query(&DuckDbQuery::Select(main_query)),
        count_sql: render_query(&count_query),
        output_columns,
        base_params,
        main_params,
    })
}

fn build_base_query(
    planned: &PlannedParquetQuery,
    params: &mut Vec<DuckValue>,
) -> Result<DuckDbQuery, QueryEngineError> {
    Ok(DuckDbQuery::Select(SelectQuery {
        distinct: false,
        projection: build_select_items(planned),
        source: QuerySource::ReadParquetParameter,
        filters: build_where_predicates(planned, params)?,
        group_by: build_group_by_expressions(planned),
        order_by: Vec::new(),
        limit: None,
        offset: None,
    }))
}

fn build_select_items(planned: &PlannedParquetQuery) -> Vec<SelectItem> {
    let mut items = planned
        .dimensions
        .iter()
        .map(|dimension| SelectItem {
            expression: Expression::Identifier(dimension.field.clone()),
            alias: Some(dimension.output_name.clone()),
        })
        .collect::<Vec<_>>();

    items.extend(planned.measures.iter().map(|measure| SelectItem {
        expression: build_measure_expression(measure),
        alias: Some(measure.output_name.clone()),
    }));

    items
}

fn build_measure_expression(measure: &PlannedMeasure) -> Expression {
    match measure.aggregation {
        PlannedAggregation::Sum => named_function("SUM", measure.field.clone()),
        PlannedAggregation::Avg => named_function("AVG", measure.field.clone()),
        PlannedAggregation::Count => Expression::CountStar,
        PlannedAggregation::Min => named_function("MIN", measure.field.clone()),
        PlannedAggregation::Max => named_function("MAX", measure.field.clone()),
        PlannedAggregation::CountDistinct => Expression::Function {
            name: "COUNT",
            distinct: true,
            arguments: vec![Expression::Identifier(measure.field.clone())],
        },
    }
}

fn build_group_by_expressions(planned: &PlannedParquetQuery) -> Vec<Expression> {
    if planned.measures.is_empty() || planned.dimensions.is_empty() {
        return Vec::new();
    }

    planned
        .dimensions
        .iter()
        .map(|dimension| Expression::Identifier(dimension.field.clone()))
        .collect::<Vec<_>>()
}

fn build_where_predicates(
    planned: &PlannedParquetQuery,
    params: &mut Vec<DuckValue>,
) -> Result<Vec<Predicate>, QueryEngineError> {
    if planned.filters.is_empty() {
        return Ok(Vec::new());
    }

    let mut clauses = Vec::with_capacity(planned.filters.len());
    for filter in &planned.filters {
        let field = Expression::Identifier(filter.field.clone());
        let clause = match filter.operator.as_str() {
            "eq" => comparison_predicate(field, ComparisonOperator::Eq, filter, params)?,
            "neq" => comparison_predicate(field, ComparisonOperator::NotEq, filter, params)?,
            "gt" => comparison_predicate(field, ComparisonOperator::Gt, filter, params)?,
            "gte" => comparison_predicate(field, ComparisonOperator::Gte, filter, params)?,
            "lt" => comparison_predicate(field, ComparisonOperator::Lt, filter, params)?,
            "lte" => comparison_predicate(field, ComparisonOperator::Lte, filter, params)?,
            "contains" => Predicate::Contains {
                value: field,
                needle: bind_single_value(filter, params)?,
            },
            "in" => Predicate::InList {
                value: field,
                values: bind_array_values(filter, params)?,
                negated: false,
            },
            "not_in" => Predicate::InList {
                value: field,
                values: bind_array_values(filter, params)?,
                negated: true,
            },
            "is_null" => Predicate::IsNull(field),
            "is_not_null" => Predicate::IsNotNull(field),
            operator => {
                return Err(QueryEngineError::InvalidFilterValue {
                    field: filter.field.clone(),
                    reason: format!("Unsupported operator: {operator}"),
                });
            }
        };
        clauses.push(clause);
    }

    Ok(clauses)
}

fn bind_single_value(
    filter: &crate::semantic::Filter,
    params: &mut Vec<DuckValue>,
) -> Result<ValueExpression, QueryEngineError> {
    let value = filter
        .value
        .as_ref()
        .ok_or_else(|| QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: "Expected a scalar value".to_string(),
        })?;

    let value = match value {
        crate::semantic::FilterValue::String(value) => DuckValue::from(value.clone()),
        crate::semantic::FilterValue::Number(value) => DuckValue::from(*value),
        crate::semantic::FilterValue::Boolean(value) => DuckValue::from(*value),
        _ => {
            return Err(QueryEngineError::InvalidFilterValue {
                field: filter.field.clone(),
                reason: "Expected a scalar value".to_string(),
            });
        }
    };

    params.push(value);
    Ok(ValueExpression::Parameter)
}

fn bind_array_values(
    filter: &crate::semantic::Filter,
    params: &mut Vec<DuckValue>,
) -> Result<Vec<ValueExpression>, QueryEngineError> {
    let value = filter
        .value
        .as_ref()
        .ok_or_else(|| QueryEngineError::InvalidFilterValue {
            field: filter.field.clone(),
            reason: "Expected an array value".to_string(),
        })?;

    let start = params.len();
    match value {
        crate::semantic::FilterValue::StringArray(values) => {
            if values.is_empty() {
                return Err(QueryEngineError::InvalidFilterValue {
                    field: filter.field.clone(),
                    reason: "Expected a non-empty array value".to_string(),
                });
            }
            params.extend(values.iter().cloned().map(DuckValue::from));
        }
        crate::semantic::FilterValue::NumberArray(values) => {
            if values.is_empty() {
                return Err(QueryEngineError::InvalidFilterValue {
                    field: filter.field.clone(),
                    reason: "Expected a non-empty array value".to_string(),
                });
            }
            params.extend(values.iter().copied().map(DuckValue::from));
        }
        _ => {
            return Err(QueryEngineError::InvalidFilterValue {
                field: filter.field.clone(),
                reason: "Expected an array value".to_string(),
            });
        }
    }

    Ok((start..params.len())
        .map(|_| ValueExpression::Parameter)
        .collect::<Vec<_>>())
}

fn duckdb_value_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Boolean(value) => json!(value),
        ValueRef::TinyInt(value) => json!(value),
        ValueRef::SmallInt(value) => json!(value),
        ValueRef::Int(value) => json!(value),
        ValueRef::BigInt(value) => json!(value),
        ValueRef::HugeInt(value) => json!(value.to_string()),
        ValueRef::UTinyInt(value) => json!(value),
        ValueRef::USmallInt(value) => json!(value),
        ValueRef::UInt(value) => json!(value),
        ValueRef::UBigInt(value) => json!(value),
        ValueRef::Float(value) => number_or_null(Some(value as f64)),
        ValueRef::Double(value) => number_or_null(Some(value)),
        ValueRef::Decimal(value) => json!(value.to_string()),
        ValueRef::Text(value) => json!(String::from_utf8_lossy(value).into_owned()),
        ValueRef::Blob(value) => json!(value),
        ValueRef::Date32(value) => json!(value),
        ValueRef::Timestamp(_, value) => json!(value),
        ValueRef::Time64(_, value) => json!(value),
        ValueRef::Interval {
            months,
            days,
            nanos,
        } => json!({
            "months": months,
            "days": days,
            "nanos": nanos
        }),
        other => json!(format!("{other:?}")),
    }
}

fn named_function(name: &'static str, field: String) -> Expression {
    Expression::Function {
        name,
        distinct: false,
        arguments: vec![Expression::Identifier(field)],
    }
}

fn comparison_predicate(
    field: Expression,
    operator: ComparisonOperator,
    filter: &crate::semantic::Filter,
    params: &mut Vec<DuckValue>,
) -> Result<Predicate, QueryEngineError> {
    Ok(Predicate::Compare {
        left: field,
        operator,
        right: bind_single_value(filter, params)?,
    })
}
