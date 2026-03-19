use duckdb::{types::ValueRef, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::duckdb_sql::{
    render_query, DuckDbQuery, Expression, OrderBy, Predicate, QuerySource, SelectItem,
    SelectQuery, ValueExpression,
};
use crate::semantic::QueryEngineError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnalyticsStackStatus {
    pub duckdb_version: String,
    pub smoke_row_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProfiledFieldSummary {
    pub name: String,
    pub data_type: String,
    pub non_null_count: usize,
    pub null_count: usize,
    pub distinct_count: usize,
    pub sample_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataSourceProfile {
    pub row_count: usize,
    pub field_count: usize,
    pub fields: Vec<ProfiledFieldSummary>,
}

pub fn verify_analytics_stack() -> Result<AnalyticsStackStatus, QueryEngineError> {
    let connection = Connection::open_in_memory()
        .map_err(|error| QueryEngineError::ParseFailed(error.to_string()))?;
    let duckdb_version: String = connection
        .query_row("SELECT version()", [], |row| row.get(0))
        .map_err(|error| QueryEngineError::ParseFailed(error.to_string()))?;
    let smoke_row_count = connection
        .query_row("SELECT COUNT(*) FROM (VALUES (1), (2))", [], |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|error| QueryEngineError::ParseFailed(error.to_string()))?
        .max(0) as usize;

    Ok(AnalyticsStackStatus {
        duckdb_version,
        smoke_row_count,
    })
}

pub fn profile_parquet_data_source(path: &str) -> Result<DataSourceProfile, QueryEngineError> {
    let connection = Connection::open_in_memory()
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let schema = parquet_schema(&connection, path)?;
    let row_count = parquet_row_count(&connection, path)?;
    let mut fields = Vec::with_capacity(schema.len());

    for (field_name, data_type) in schema {
        fields.push(profile_field(
            &connection,
            path,
            &field_name,
            &data_type,
            row_count,
        )?);
    }

    Ok(DataSourceProfile {
        row_count,
        field_count: fields.len(),
        fields,
    })
}

fn parquet_schema(
    connection: &Connection,
    path: &str,
) -> Result<Vec<(String, String)>, QueryEngineError> {
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
        .map(|field| (field.name().to_string(), field.data_type().to_string()))
        .collect::<Vec<_>>())
}

fn parquet_row_count(connection: &Connection, path: &str) -> Result<usize, QueryEngineError> {
    connection
        .query_row("SELECT COUNT(*) FROM read_parquet(?)", [path], |row| {
            row.get::<_, i64>(0)
        })
        .map(|count| count.max(0) as usize)
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))
}

fn profile_field(
    connection: &Connection,
    path: &str,
    field_name: &str,
    data_type: &str,
    row_count: usize,
) -> Result<ProfiledFieldSummary, QueryEngineError> {
    let field = Expression::Identifier(field_name.to_string());
    let stats_sql = render_query(&DuckDbQuery::Select(SelectQuery {
        distinct: false,
        projection: vec![
            SelectItem {
                expression: Expression::Function {
                    name: "COUNT",
                    distinct: false,
                    arguments: vec![field.clone()],
                },
                alias: None,
            },
            SelectItem {
                expression: Expression::Function {
                    name: "COUNT",
                    distinct: true,
                    arguments: vec![field.clone()],
                },
                alias: None,
            },
        ],
        source: QuerySource::ReadParquetParameter,
        filters: Vec::new(),
        group_by: Vec::new(),
        order_by: Vec::new(),
        limit: None,
        offset: None,
    }));

    let (non_null_count, distinct_count) = connection
        .query_row(&stats_sql, [path], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;

    let sample_values = profile_field_samples(connection, path, field)?;

    Ok(ProfiledFieldSummary {
        name: field_name.to_string(),
        data_type: data_type.to_string(),
        non_null_count: non_null_count.max(0) as usize,
        null_count: row_count.saturating_sub(non_null_count.max(0) as usize),
        distinct_count: distinct_count.max(0) as usize,
        sample_values,
    })
}

fn profile_field_samples(
    connection: &Connection,
    path: &str,
    field: Expression,
) -> Result<Vec<String>, QueryEngineError> {
    let sql = render_query(&DuckDbQuery::Select(SelectQuery {
        distinct: true,
        projection: vec![SelectItem {
            expression: Expression::Cast {
                expression: Box::new(field.clone()),
                data_type: "VARCHAR",
            },
            alias: Some("sample_value".to_string()),
        }],
        source: QuerySource::ReadParquetParameter,
        filters: vec![Predicate::IsNotNull(field)],
        group_by: Vec::new(),
        order_by: vec![OrderBy {
            expression: Expression::Identifier("sample_value".to_string()),
            descending: false,
        }],
        limit: Some(ValueExpression::IntegerLiteral(3)),
        offset: None,
    }));

    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let mut rows = statement
        .query([path])
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
    let mut samples = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?
    {
        let value = row
            .get_ref(0)
            .map_err(|error| QueryEngineError::ExecutionFailed(error.to_string()))?;
        samples.push(sample_value_to_string(value));
    }

    Ok(samples)
}

fn sample_value_to_string(value: ValueRef<'_>) -> String {
    match value {
        ValueRef::Null => String::new(),
        ValueRef::Boolean(value) => value.to_string(),
        ValueRef::TinyInt(value) => value.to_string(),
        ValueRef::SmallInt(value) => value.to_string(),
        ValueRef::Int(value) => value.to_string(),
        ValueRef::BigInt(value) => value.to_string(),
        ValueRef::HugeInt(value) => value.to_string(),
        ValueRef::UTinyInt(value) => value.to_string(),
        ValueRef::USmallInt(value) => value.to_string(),
        ValueRef::UInt(value) => value.to_string(),
        ValueRef::UBigInt(value) => value.to_string(),
        ValueRef::Float(value) => value.to_string(),
        ValueRef::Double(value) => json!(value).to_string(),
        ValueRef::Decimal(value) => value.to_string(),
        ValueRef::Text(value) => String::from_utf8_lossy(value).into_owned(),
        ValueRef::Blob(value) => json!(value).to_string(),
        ValueRef::Date32(value) => value.to_string(),
        ValueRef::Timestamp(_, value) => value.to_string(),
        ValueRef::Time64(_, value) => value.to_string(),
        ValueRef::Interval {
            months,
            days,
            nanos,
        } => json!({
            "months": months,
            "days": days,
            "nanos": nanos
        })
        .to_string(),
        other => Value::String(format!("{other:?}")).to_string(),
    }
}
