#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum DuckDbQuery {
    Select(SelectQuery),
    CountRows {
        source: Box<DuckDbQuery>,
        alias: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct SelectQuery {
    pub distinct: bool,
    pub projection: Vec<SelectItem>,
    pub source: QuerySource,
    pub filters: Vec<Predicate>,
    pub group_by: Vec<Expression>,
    pub order_by: Vec<OrderBy>,
    pub limit: Option<ValueExpression>,
    pub offset: Option<ValueExpression>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum QuerySource {
    ReadParquetParameter,
    Subquery {
        query: Box<DuckDbQuery>,
        alias: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct SelectItem {
    pub expression: Expression,
    pub alias: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Expression {
    Wildcard,
    Identifier(String),
    CountStar,
    Function {
        name: &'static str,
        distinct: bool,
        arguments: Vec<Expression>,
    },
    Cast {
        expression: Box<Expression>,
        data_type: &'static str,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Predicate {
    Compare {
        left: Expression,
        operator: ComparisonOperator,
        right: ValueExpression,
    },
    Contains {
        value: Expression,
        needle: ValueExpression,
    },
    InList {
        value: Expression,
        values: Vec<ValueExpression>,
        negated: bool,
    },
    IsNull(Expression),
    IsNotNull(Expression),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ComparisonOperator {
    Eq,
    NotEq,
    Gt,
    Gte,
    Lt,
    Lte,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ValueExpression {
    Parameter,
    IntegerLiteral(i64),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OrderBy {
    pub expression: Expression,
    pub descending: bool,
}

pub(crate) fn render_query(query: &DuckDbQuery) -> String {
    match query {
        DuckDbQuery::Select(select) => render_select_query(select),
        DuckDbQuery::CountRows { source, alias } => format!(
            "SELECT COUNT(*) AS __row_count FROM ({}) AS {}",
            render_query(source),
            quote_identifier(alias)
        ),
    }
}

fn render_select_query(query: &SelectQuery) -> String {
    let mut sql = format!(
        "SELECT {}{} FROM {}",
        if query.distinct { "DISTINCT " } else { "" },
        query
            .projection
            .iter()
            .map(render_select_item)
            .collect::<Vec<_>>()
            .join(", "),
        render_source(&query.source)
    );

    if !query.filters.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(
            &query
                .filters
                .iter()
                .map(render_predicate)
                .collect::<Vec<_>>()
                .join(" AND "),
        );
    }

    if !query.group_by.is_empty() {
        sql.push_str(" GROUP BY ");
        sql.push_str(
            &query
                .group_by
                .iter()
                .map(render_expression)
                .collect::<Vec<_>>()
                .join(", "),
        );
    }

    if !query.order_by.is_empty() {
        sql.push_str(" ORDER BY ");
        sql.push_str(
            &query
                .order_by
                .iter()
                .map(render_order_by)
                .collect::<Vec<_>>()
                .join(", "),
        );
    }

    if let Some(limit) = &query.limit {
        sql.push_str(" LIMIT ");
        sql.push_str(&render_value_expression(limit));
    }

    if let Some(offset) = &query.offset {
        sql.push_str(" OFFSET ");
        sql.push_str(&render_value_expression(offset));
    }

    sql
}

fn render_source(source: &QuerySource) -> String {
    match source {
        QuerySource::ReadParquetParameter => "read_parquet(?)".to_string(),
        QuerySource::Subquery { query, alias } => {
            format!("({}) AS {}", render_query(query), quote_identifier(alias))
        }
    }
}

fn render_select_item(item: &SelectItem) -> String {
    match &item.alias {
        Some(alias) => format!(
            "{} AS {}",
            render_expression(&item.expression),
            quote_identifier(alias)
        ),
        None => render_expression(&item.expression),
    }
}

fn render_expression(expression: &Expression) -> String {
    match expression {
        Expression::Wildcard => "*".to_string(),
        Expression::Identifier(identifier) => quote_identifier(identifier),
        Expression::CountStar => "COUNT(*)".to_string(),
        Expression::Function {
            name,
            distinct,
            arguments,
        } => {
            let rendered_arguments = arguments
                .iter()
                .map(render_expression)
                .collect::<Vec<_>>()
                .join(", ");
            if *distinct {
                format!("{name}(DISTINCT {rendered_arguments})")
            } else {
                format!("{name}({rendered_arguments})")
            }
        }
        Expression::Cast {
            expression,
            data_type,
        } => format!("CAST({} AS {data_type})", render_expression(expression)),
    }
}

fn render_predicate(predicate: &Predicate) -> String {
    match predicate {
        Predicate::Compare {
            left,
            operator,
            right,
        } => format!(
            "{} {} {}",
            render_expression(left),
            render_comparison_operator(*operator),
            render_value_expression(right)
        ),
        Predicate::Contains { value, needle } => format!(
            "strpos(CAST({} AS VARCHAR), {}) > 0",
            render_expression(value),
            render_value_expression(needle)
        ),
        Predicate::InList {
            value,
            values,
            negated,
        } => format!(
            "{} {} ({})",
            render_expression(value),
            if *negated { "NOT IN" } else { "IN" },
            values
                .iter()
                .map(render_value_expression)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        Predicate::IsNull(expression) => format!("{} IS NULL", render_expression(expression)),
        Predicate::IsNotNull(expression) => {
            format!("{} IS NOT NULL", render_expression(expression))
        }
    }
}

fn render_comparison_operator(operator: ComparisonOperator) -> &'static str {
    match operator {
        ComparisonOperator::Eq => "=",
        ComparisonOperator::NotEq => "<>",
        ComparisonOperator::Gt => ">",
        ComparisonOperator::Gte => ">=",
        ComparisonOperator::Lt => "<",
        ComparisonOperator::Lte => "<=",
    }
}

fn render_order_by(order_by: &OrderBy) -> String {
    format!(
        "{} {}",
        render_expression(&order_by.expression),
        if order_by.descending { "DESC" } else { "ASC" }
    )
}

fn render_value_expression(value: &ValueExpression) -> String {
    match value {
        ValueExpression::Parameter => "?".to_string(),
        ValueExpression::IntegerLiteral(value) => value.to_string(),
    }
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

#[cfg(test)]
mod tests {
    use super::{
        render_query, ComparisonOperator, DuckDbQuery, Expression, OrderBy, Predicate, QuerySource,
        SelectItem, SelectQuery, ValueExpression,
    };

    #[test]
    fn renders_nested_select_with_bound_parameters_and_escaped_identifiers() {
        let base = DuckDbQuery::Select(SelectQuery {
            distinct: false,
            projection: vec![
                SelectItem {
                    expression: Expression::Identifier("city".to_string()),
                    alias: Some("city name".to_string()),
                },
                SelectItem {
                    expression: Expression::Function {
                        name: "SUM",
                        distinct: false,
                        arguments: vec![Expression::Identifier("revenue".to_string())],
                    },
                    alias: Some("total\"revenue".to_string()),
                },
            ],
            source: QuerySource::ReadParquetParameter,
            filters: vec![Predicate::Compare {
                left: Expression::Identifier("region".to_string()),
                operator: ComparisonOperator::Eq,
                right: ValueExpression::Parameter,
            }],
            group_by: vec![Expression::Identifier("city".to_string())],
            order_by: vec![],
            limit: None,
            offset: None,
        });
        let query = DuckDbQuery::Select(SelectQuery {
            distinct: false,
            projection: vec![SelectItem {
                expression: Expression::Identifier("city name".to_string()),
                alias: None,
            }],
            source: QuerySource::Subquery {
                query: Box::new(base),
                alias: "result".to_string(),
            },
            filters: vec![],
            group_by: vec![],
            order_by: vec![OrderBy {
                expression: Expression::Identifier("city name".to_string()),
                descending: false,
            }],
            limit: Some(ValueExpression::Parameter),
            offset: Some(ValueExpression::Parameter),
        });

        assert_eq!(
            render_query(&query),
            "SELECT \"city name\" FROM (SELECT \"city\" AS \"city name\", SUM(\"revenue\") AS \"total\"\"revenue\" FROM read_parquet(?) WHERE \"region\" = ? GROUP BY \"city\") AS \"result\" ORDER BY \"city name\" ASC LIMIT ? OFFSET ?"
        );
    }

    #[test]
    fn renders_row_count_wrapper() {
        let query = DuckDbQuery::CountRows {
            source: Box::new(DuckDbQuery::Select(SelectQuery {
                distinct: false,
                projection: vec![SelectItem {
                    expression: Expression::CountStar,
                    alias: None,
                }],
                source: QuerySource::ReadParquetParameter,
                filters: vec![],
                group_by: vec![],
                order_by: vec![],
                limit: None,
                offset: None,
            })),
            alias: "counted".to_string(),
        };

        assert_eq!(
            render_query(&query),
            "SELECT COUNT(*) AS __row_count FROM (SELECT COUNT(*) FROM read_parquet(?)) AS \"counted\""
        );
    }
}
