import { Badge } from "@bi/ui-kit";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";

interface DataPreviewTableProps {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

function DataPreviewTable({ columns, rows, totalRows }: DataPreviewTableProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="py-2">
        <p className="m-0 text-sm text-slate-500">{copy.dataPreview.empty}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric-card">
          <span className="text-2xl font-semibold text-[#1F2D3D]">
            {columns.length}
          </span>
          <span className="preview-label">{copy.dataPreview.columns}</span>
        </div>
        <div className="metric-card">
          <span className="text-2xl font-semibold text-[#1F2D3D]">
            {rows.length}
          </span>
          <span className="preview-label">{copy.dataPreview.previewRows}</span>
        </div>
        <div className="metric-card">
          <span className="text-2xl font-semibold text-[#1F2D3D]">
            {totalRows}
          </span>
          <span className="preview-label">{copy.dataPreview.totalRows}</span>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        aria-label={copy.dataPreview.previewColumnsAriaLabel}
      >
        {columns.map((column) => (
          <Badge key={column}>{column}</Badge>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="row-index sticky top-0 z-10 w-16 min-w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 max-w-[280px] overflow-hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 text-ellipsis whitespace-nowrap"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${columns[0] ?? "row"}`}>
                <td className="w-16 min-w-16 border-t px-4 py-3 text-sm text-slate-500">
                  {index + 1}
                </td>
                {columns.map((column) => {
                  const value = row[column] ?? "";
                  return (
                    <td
                      key={`${index}-${column}`}
                      title={value}
                      className="max-w-[280px] overflow-hidden border-t px-4 py-3 text-sm text-[#33475B] text-ellipsis whitespace-nowrap"
                    >
                      {value.length > 0 ? (
                        value
                      ) : (
                        <span className="italic text-slate-500">
                          {copy.dataPreview.emptyCell}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataPreviewTable;
