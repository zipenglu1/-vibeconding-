use crate::semantic::{
    dimension_output_name, measure_output_name, validate_sort_fields, Filter, Measure,
    QueryEngineError, SemanticQuery, SortOrder,
};

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct PlannedParquetQuery {
    pub data_source: String,
    pub dimensions: Vec<PlannedDimension>,
    pub measures: Vec<PlannedMeasure>,
    pub filters: Vec<Filter>,
    pub sort_orders: Vec<SortOrder>,
    pub limit: usize,
    pub offset: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct PlannedDimension {
    pub field: String,
    pub output_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct PlannedMeasure {
    pub field: String,
    pub output_name: String,
    pub aggregation: PlannedAggregation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum PlannedAggregation {
    Sum,
    Avg,
    Count,
    Min,
    Max,
    CountDistinct,
}

pub(crate) fn build_parquet_query_plan(
    query: &SemanticQuery,
) -> Result<PlannedParquetQuery, QueryEngineError> {
    let dimensions = query
        .dimensions
        .iter()
        .map(|dimension| PlannedDimension {
            field: dimension.field.clone(),
            output_name: dimension_output_name(dimension),
        })
        .collect::<Vec<_>>();

    let measures = query
        .measures
        .iter()
        .map(planned_measure_from_query)
        .collect::<Result<Vec<_>, _>>()?;

    let output_columns = dimensions
        .iter()
        .map(|dimension| dimension.output_name.clone())
        .chain(measures.iter().map(|measure| measure.output_name.clone()))
        .collect::<Vec<_>>();
    let sort_orders = query.sort.clone().unwrap_or_default();
    validate_sort_fields(&output_columns, &sort_orders)?;

    Ok(PlannedParquetQuery {
        data_source: query.data_source.clone(),
        dimensions,
        measures,
        filters: query.filters.clone().unwrap_or_default(),
        sort_orders,
        limit: query.limit.unwrap_or(usize::MAX),
        offset: query.offset.unwrap_or(0),
    })
}

fn planned_measure_from_query(measure: &Measure) -> Result<PlannedMeasure, QueryEngineError> {
    Ok(PlannedMeasure {
        field: measure.field.clone(),
        output_name: measure_output_name(measure),
        aggregation: match measure.aggregation.as_str() {
            "sum" => PlannedAggregation::Sum,
            "avg" => PlannedAggregation::Avg,
            "count" => PlannedAggregation::Count,
            "min" => PlannedAggregation::Min,
            "max" => PlannedAggregation::Max,
            "count_distinct" => PlannedAggregation::CountDistinct,
            aggregation => {
                return Err(QueryEngineError::InvalidAggregation {
                    field: measure.field.clone(),
                    aggregation: aggregation.to_string(),
                });
            }
        },
    })
}
