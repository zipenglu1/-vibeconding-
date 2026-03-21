import { Suspense, lazy, useDeferredValue } from "react";
import type { ChartVariant } from "../../../entities/chart/types";
import type { QueryBuilderState } from "../../../entities/field/types";
import type { ChartSpec, QueryResult } from "@bi/ts-contracts";
import { Button } from "@bi/ui-kit";
import FieldDropZone from "../../../shared/dnd/FieldDropZone";
import { useAppUiStore } from "../../../shared/lib/appUiStore";

const QueryResultChart = lazy(() =>
  import("@bi/chart-presets").then((module) => ({
    default: module.QueryResultChart,
  })),
);

interface ChartBuilderPanelProps {
  queryBuilder: QueryBuilderState;
  queryResult: QueryResult | null;
  chartSpec: ChartSpec | null;
  chartVariant: ChartVariant;
  isRunningQuery: boolean;
  onChartVariantChange: (variant: ChartVariant) => void;
  onAssignCategoryField: (fieldName: string) => void;
  onAssignValueField: (fieldName: string) => void;
}

function ChartBuilderPanel({
  queryBuilder,
  queryResult,
  chartSpec,
  chartVariant,
  isRunningQuery,
  onChartVariantChange,
  onAssignCategoryField,
  onAssignValueField,
}: ChartBuilderPanelProps) {
  const language = useAppUiStore((state) => state.language);
  const copy =
    language === "zh"
      ? {
          title: "\u62d6\u62fd\u56fe\u8868\u6784\u5efa",
          description:
            "\u628a\u5b57\u6bb5\u62d6\u5230\u5206\u7c7b\u8f74\u548c\u503c\u8f74\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u751f\u6210\u5f53\u524d\u56fe\u8868\u914d\u7f6e\u5e76\u5237\u65b0\u9884\u89c8\u3002",
          categoryAxis: "\u5206\u7c7b\u8f74",
          valueAxis: "\u6570\u503c\u8f74",
          categoryHelper:
            "\u62d6\u5165\u5206\u7c7b\u5b57\u6bb5\uff0c\u7528\u4e8e\u56fe\u8868 X \u8f74\u6216\u5206\u7ec4\u3002",
          valueHelper:
            "\u62d6\u5165\u6570\u503c\u5b57\u6bb5\uff0c\u7528\u4e8e\u56fe\u8868 Y \u8f74\u6216\u805a\u5408\u503c\u3002",
          chartPreview: "\u56fe\u8868\u9884\u89c8",
          bar: "\u67f1\u72b6\u56fe",
          line: "\u6298\u7ebf\u56fe",
          loading: "\u6b63\u5728\u5237\u65b0\u56fe\u8868\u9884\u89c8\u2026",
          empty:
            "\u5148\u8fd0\u884c\u4e00\u4e2a\u5305\u542b\u5206\u7c7b\u5217\u548c\u6570\u503c\u5217\u7684\u67e5\u8be2\uff0c\u56fe\u8868\u9884\u89c8\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
        }
      : {
          title: "Drag-to-chart builder",
          description:
            "Drop fields onto the category and value axes to generate the current chart configuration and refresh the preview automatically.",
          categoryAxis: "Category axis",
          valueAxis: "Value axis",
          categoryHelper:
            "Drop a categorical field here for the x-axis or grouping.",
          valueHelper:
            "Drop a numeric field here for the y-axis or aggregated value.",
          chartPreview: "Chart preview",
          bar: "Bar",
          line: "Line",
          loading: "Refreshing chart preview...",
          empty:
            "Run a query with one categorical column and one numeric value to preview the chart here.",
        };
  const deferredQueryResult = useDeferredValue(queryResult);
  const deferredChartSpec = useDeferredValue(chartSpec);

  return (
    <section className="chart-builder-panel">
      <div className="chart-toolbar">
        <div className="grid gap-1">
          <h3 className="m-0 text-lg font-semibold text-[#1F2D3D]">
            {copy.title}
          </h3>
          <p className="helper-text">{copy.description}</p>
        </div>
        <div className="chart-toggle-group">
          <Button
            variant={chartVariant === "bar" ? "default" : "ghost"}
            className={`chart-toggle${chartVariant === "bar" ? " active" : ""}`}
            onClick={() => onChartVariantChange("bar")}
          >
            {copy.bar}
          </Button>
          <Button
            variant={chartVariant === "line" ? "default" : "ghost"}
            className={`chart-toggle${chartVariant === "line" ? " active" : ""}`}
            onClick={() => onChartVariantChange("line")}
          >
            {copy.line}
          </Button>
        </div>
      </div>

      <div className="drop-zone-grid">
        <FieldDropZone
          label={copy.categoryAxis}
          value={queryBuilder.dimensionField}
          helperText={copy.categoryHelper}
          onFieldDrop={(payload) => onAssignCategoryField(payload.name)}
        />
        <FieldDropZone
          label={copy.valueAxis}
          value={queryBuilder.measureField}
          helperText={copy.valueHelper}
          onFieldDrop={(payload) => onAssignValueField(payload.name)}
        />
      </div>

      <div className="grid gap-3">
        <span className="preview-label">{copy.chartPreview}</span>
        {isRunningQuery ? (
          <div className="chart-empty">
            <p className="empty-state">{copy.loading}</p>
          </div>
        ) : deferredChartSpec && deferredQueryResult ? (
          <Suspense
            fallback={
              <div className="chart-empty">
                <p className="empty-state">{copy.loading}</p>
              </div>
            }
          >
            <QueryResultChart
              result={deferredQueryResult}
              chartSpec={deferredChartSpec}
              variant={chartVariant}
            />
          </Suspense>
        ) : (
          <div className="chart-empty">
            <p className="empty-state">{copy.empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ChartBuilderPanel;
