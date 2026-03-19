export const FILTER_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains",
  "is_null",
  "is_not_null",
] as const;

export const MEASURE_AGGREGATIONS = [
  "sum",
  "avg",
  "count",
  "min",
  "max",
  "count_distinct",
] as const;

export interface QueryBuilderState {
  name: string;
  dimensionField: string;
  dimensionAlias: string;
  measureField: string;
  measureAlias: string;
  measureAggregation: (typeof MEASURE_AGGREGATIONS)[number];
  filterEnabled: boolean;
  filterField: string;
  filterOperator: (typeof FILTER_OPERATORS)[number];
  filterValue: string;
  limit: string;
}
