import type {
  DataColumn,
  Filter,
  LoadedDataSource,
  SemanticQuery,
} from "@bi/ts-contracts";
import type { QueryBuilderState } from "./types";

const DEFAULT_MEASURE_AGGREGATION = "sum";

export function numericColumns(activeDataSource: LoadedDataSource | null) {
  return (
    activeDataSource?.columns.filter(
      (column) =>
        column.data_type === "integer" || column.data_type === "number",
    ) ?? []
  );
}

export function createEmptyQueryBuilderState(): QueryBuilderState {
  return {
    name: "",
    dimensionField: "",
    dimensionAlias: "",
    measureField: "",
    measureAlias: "",
    measureAggregation: DEFAULT_MEASURE_AGGREGATION,
    filterEnabled: false,
    filterField: "",
    filterOperator: "eq",
    filterValue: "",
    limit: "10",
  };
}

export function createQueryBuilderState(
  activeDataSource: LoadedDataSource | null,
): QueryBuilderState {
  if (!activeDataSource) {
    return createEmptyQueryBuilderState();
  }

  const dimensionColumn = activeDataSource.columns[0]?.name ?? "";
  const numericColumn =
    numericColumns(activeDataSource)[0]?.name ??
    activeDataSource.columns[0]?.name ??
    "";

  return {
    name:
      numericColumn && dimensionColumn
        ? `${numericColumn} by ${dimensionColumn}`
        : "Query",
    dimensionField: dimensionColumn,
    dimensionAlias: dimensionColumn,
    measureField: numericColumn,
    measureAlias: numericColumn ? `total_${numericColumn}` : "",
    measureAggregation: DEFAULT_MEASURE_AGGREGATION,
    filterEnabled: false,
    filterField: activeDataSource.columns[0]?.name ?? "",
    filterOperator: "eq",
    filterValue: "",
    limit: "10",
  };
}

export function buildQueryFromBuilder(
  activeDataSource: LoadedDataSource,
  builder: QueryBuilderState,
): SemanticQuery | null {
  const dimensions = builder.dimensionField
    ? [
        {
          field: builder.dimensionField,
          alias: builder.dimensionAlias.trim() || undefined,
        },
      ]
    : [];
  const measures = builder.measureField
    ? [
        {
          field: builder.measureField,
          alias:
            builder.measureAlias.trim() ||
            `${builder.measureAggregation}_${builder.measureField}`,
          aggregation: builder.measureAggregation,
        },
      ]
    : [];

  if (dimensions.length === 0 && measures.length === 0) {
    return null;
  }

  const filters = buildQueryFilters(activeDataSource, builder);
  const limit = Number.parseInt(builder.limit, 10);
  const primarySortField =
    measures[0]?.alias ??
    (measures[0]
      ? `${measures[0].aggregation}_${measures[0].field}`
      : (dimensions[0]?.alias ?? dimensions[0]?.field));

  return {
    name: builder.name.trim() || "Ad hoc query",
    dataSource: activeDataSource.info.cache_path ?? activeDataSource.info.path,
    dimensions,
    measures,
    filters: filters.length > 0 ? filters : undefined,
    sort: primarySortField
      ? [
          {
            field: primarySortField,
            direction: measures.length > 0 ? "desc" : "asc",
          },
        ]
      : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    offset: 0,
  };
}

function buildQueryFilters(
  activeDataSource: LoadedDataSource,
  builder: QueryBuilderState,
): Filter[] {
  if (!builder.filterEnabled || !builder.filterField) {
    return [];
  }

  const selectedColumn = activeDataSource.columns.find(
    (column) => column.name === builder.filterField,
  );
  if (!selectedColumn) {
    return [];
  }

  const operator = builder.filterOperator;
  if (operator === "is_null" || operator === "is_not_null") {
    return [{ field: builder.filterField, operator, value: "" }];
  }

  const rawValue = builder.filterValue.trim();
  if (!rawValue) {
    return [];
  }

  return [
    {
      field: builder.filterField,
      operator,
      value: parseFilterValue(selectedColumn, operator, rawValue),
    },
  ];
}

function parseFilterValue(
  column: DataColumn,
  operator: QueryBuilderState["filterOperator"],
  rawValue: string,
) {
  const isNumericColumn =
    column.data_type === "integer" || column.data_type === "number";

  if (operator === "in" || operator === "not_in") {
    const parts = rawValue
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return isNumericColumn ? parts.map((part) => Number(part)) : parts;
  }

  if (
    isNumericColumn &&
    ["gt", "gte", "lt", "lte", "eq", "neq"].includes(operator)
  ) {
    const parsed = Number(rawValue);
    return Number.isNaN(parsed) ? rawValue : parsed;
  }

  return rawValue;
}
