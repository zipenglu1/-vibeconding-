import { useMemo, useState } from "react";
import type { QueryResult } from "@bi/ts-contracts";
import { Button, PanelHeader } from "@bi/ui-kit";
import { useAppUiStore } from "../lib/appUiStore";
import { getWorkbenchCopy } from "../lib/i18n";

type SortDirection = "asc" | "desc";

interface QueryResultTableProps {
  result: QueryResult;
  title: string;
  interactive?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface TableState {
  resultSignature: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageIndex: number;
  pageSize: (typeof PAGE_SIZE_OPTIONS)[number];
}

function QueryResultTable({
  result,
  title,
  interactive = false,
}: QueryResultTableProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);
  const resultSignature = useMemo(
    () =>
      JSON.stringify([
        result.columns,
        result.rows.length,
        result.executionTimeMs,
        result.totalRows ?? null,
      ]),
    [
      result.columns,
      result.executionTimeMs,
      result.rows.length,
      result.totalRows,
    ],
  );
  const [tableState, setTableState] = useState<TableState>(() =>
    createInitialTableState(resultSignature),
  );

  const { sortColumn, sortDirection, pageIndex, pageSize } =
    tableState.resultSignature === resultSignature
      ? tableState
      : createInitialTableState(resultSignature);

  const sortedRows = useMemo(() => {
    if (!interactive || !sortColumn) {
      return result.rows;
    }

    return [...result.rows].sort((leftRow, rightRow) =>
      compareQueryValues(
        leftRow[sortColumn],
        rightRow[sortColumn],
        sortDirection,
      ),
    );
  }, [interactive, result.rows, sortColumn, sortDirection]);

  const totalPages = interactive
    ? Math.max(1, Math.ceil(sortedRows.length / pageSize))
    : 1;
  const boundedPageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleRows = interactive
    ? sortedRows.slice(
        boundedPageIndex * pageSize,
        boundedPageIndex * pageSize + pageSize,
      )
    : sortedRows;

  return (
    <>
      <PanelHeader
        title={title}
        meta={copy.queryResultTable.rowsMeta(
          result.totalRows ?? result.rows.length,
        )}
      />
      {interactive ? (
        <div className="result-table-toolbar">
          <div className="result-table-summary">
            <span>
              {copy.queryResultTable.pageSummary(
                boundedPageIndex + 1,
                totalPages,
              )}
            </span>
            <span>{copy.queryResultTable.visibleRows(visibleRows.length)}</span>
            {sortColumn ? (
              <span>{copy.queryResultTable.sortedBy(sortColumn, sortDirection)}</span>
            ) : null}
          </div>
          <div className="result-table-actions">
            {PAGE_SIZE_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={pageSize === option ? "default" : "ghost"}
                onClick={() => {
                  setTableState((current) => ({
                    ...resolveTableState(current, resultSignature),
                    pageSize: option,
                    pageIndex: 0,
                  }));
                }}
              >
                {copy.queryResultTable.pageSize(option)}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() =>
                setTableState((current) => ({
                  ...resolveTableState(current, resultSignature),
                  pageIndex: Math.max(
                    0,
                    resolveTableState(current, resultSignature).pageIndex - 1,
                  ),
                }))
              }
              disabled={boundedPageIndex === 0}
            >
              {copy.queryResultTable.previous}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setTableState((current) => ({
                  ...resolveTableState(current, resultSignature),
                  pageIndex: Math.min(
                    totalPages - 1,
                    resolveTableState(current, resultSignature).pageIndex + 1,
                  ),
                }))
              }
              disabled={boundedPageIndex >= totalPages - 1}
            >
              {copy.queryResultTable.next}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="table-wrap query-table">
        <table>
          <thead>
            <tr>
              {result.columns.map((column) => {
                const isSorted = sortColumn === column;
                const sortLabel = isSorted
                  ? ` (${copy.queryResultTable.sortDirection[sortDirection]})`
                  : "";
                return (
                  <th key={column}>
                    {interactive ? (
                      <button
                        type="button"
                        className={`result-table-sort${isSorted ? " active" : ""}`}
                        onClick={() => {
                          setTableState((current) => {
                            const nextState = resolveTableState(
                              current,
                              resultSignature,
                            );
                            if (nextState.sortColumn === column) {
                              return {
                                ...nextState,
                                pageIndex: 0,
                                sortDirection:
                                  nextState.sortDirection === "asc"
                                    ? "desc"
                                    : "asc",
                              };
                            }
                            return {
                              ...nextState,
                              pageIndex: 0,
                              sortColumn: column,
                              sortDirection: "asc",
                            };
                          });
                        }}
                      >
                        {column}
                        {sortLabel}
                      </button>
                    ) : (
                      column
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`query-result-row-${boundedPageIndex}-${index}`}>
                {result.columns.map((column) => (
                  <td key={`${boundedPageIndex}-${index}-${column}`}>
                    {formatQueryCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function compareQueryValues(
  left: unknown,
  right: unknown,
  direction: SortDirection,
) {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);

  if (normalizedLeft < normalizedRight) {
    return direction === "asc" ? -1 : 1;
  }
  if (normalizedLeft > normalizedRight) {
    return direction === "asc" ? 1 : -1;
  }
  return 0;
}

function normalizeSortValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value.toLowerCase() : numeric;
  }
  return JSON.stringify(value);
}

function formatQueryCell(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function createInitialTableState(resultSignature: string): TableState {
  return {
    resultSignature,
    sortColumn: null,
    sortDirection: "asc",
    pageIndex: 0,
    pageSize: 10,
  };
}

function resolveTableState(
  current: TableState,
  resultSignature: string,
): TableState {
  return current.resultSignature === resultSignature
    ? current
    : createInitialTableState(resultSignature);
}

export default QueryResultTable;
