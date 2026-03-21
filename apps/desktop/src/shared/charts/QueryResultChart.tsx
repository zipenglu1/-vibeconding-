import { useRef } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts, EChartsOption } from "echarts";
import type { ChartSpec, QueryResult } from "@bi/ts-contracts";

export type ChartVariant = "bar" | "line";

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface QueryResultChartProps {
  result: QueryResult | null;
  chartSpec?: ChartSpec | null;
  variant: ChartVariant;
}

function QueryResultChart({
  result,
  chartSpec,
  variant,
}: QueryResultChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null);

  const chartModel = result
    ? createChartModel(result, chartSpec ?? null)
    : null;
  if (!chartModel) {
    return (
      <div className="chart-empty">
        <p className="empty-state">
          Run a query with one categorical column and one numeric value to
          render a chart.
        </p>
      </div>
    );
  }

  const option: EChartsOption = {
    animationDuration: 760,
    animationDurationUpdate: 420,
    animationEasing: "cubicOut",
    animationEasingUpdate: "cubicOut",
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: variant === "line" ? "line" : "shadow",
        lineStyle: {
          color: "rgba(0, 122, 255, 0.45)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(0, 122, 255, 0.06)",
        },
      },
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(0, 122, 255, 0.24)",
      borderWidth: 1,
      textStyle: {
        color: "#1F2D3D",
      },
    },
    grid: {
      top: 24,
      right: 20,
      bottom: 56,
      left: 56,
    },
    xAxis: {
      type: "category",
      data: chartModel.categories,
      boundaryGap: variant === "bar",
      axisLine: {
        lineStyle: {
          color: "rgba(148, 163, 184, 0.4)",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        interval: 0,
        rotate: chartModel.categories.length > 4 ? 20 : 0,
        color: "#6B7B8E",
        fontFamily:
          "'JetBrains Mono', 'Roboto Mono', 'Cascadia Code', monospace",
      },
    },
    yAxis: {
      type: "value",
      name: chartModel.measureLabel,
      nameTextStyle: {
        color: "#7A8A9A",
        fontFamily:
          "'JetBrains Mono', 'Roboto Mono', 'Cascadia Code', monospace",
      },
      splitLine: {
        lineStyle: {
          color: "rgba(224, 230, 237, 0.9)",
          type: "dashed",
        },
      },
      axisLabel: {
        color: "#7A8A9A",
        fontFamily:
          "'JetBrains Mono', 'Roboto Mono', 'Cascadia Code', monospace",
      },
    },
    series: [
      {
        name: chartModel.measureLabel,
        type: variant,
        data: chartModel.values,
        smooth: variant === "line",
        showSymbol: variant === "line",
        symbolSize: 9,
        itemStyle: {
          color: "#007AFF",
        },
        lineStyle:
          variant === "line"
            ? {
                width: 3,
                color: "#007AFF",
              }
            : undefined,
        areaStyle:
          variant === "line"
            ? {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(0, 122, 255, 0.16)" },
                    { offset: 1, color: "rgba(0, 122, 255, 0.01)" },
                  ],
                },
              }
            : undefined,
        barMaxWidth: 42,
        emphasis: {
          itemStyle: {
            color: "#0067D6",
          },
        },
      },
    ],
  };

  return (
    <div className="chart-surface">
      <ReactEChartsCore
        echarts={echarts}
        ref={chartRef}
        option={option}
        style={{ height: 320, width: "100%" }}
        notMerge
        lazyUpdate
        onChartReady={(instance: ECharts) => {
          instance.resize();
        }}
      />
    </div>
  );
}

interface ChartModel {
  categories: string[];
  values: number[];
  measureLabel: string;
}

function createChartModel(
  result: QueryResult,
  chartSpec: ChartSpec | null,
): ChartModel | null {
  if (result.columns.length < 2 || result.rows.length === 0) {
    return null;
  }

  const categoryField = resolveCategoryField(result, chartSpec);
  const measureField = resolveMeasureField(result, chartSpec);

  if (!categoryField || !measureField) {
    return null;
  }

  const points = result.rows
    .map((row) => ({
      category: normalizeCategoryValue(row[categoryField]),
      value: normalizeNumericValue(row[measureField]),
    }))
    .filter(
      (point): point is { category: string; value: number } =>
        point.category !== null && point.value !== null,
    );

  if (points.length === 0) {
    return null;
  }

  return {
    categories: points.map((point) => point.category),
    values: points.map((point) => point.value),
    measureLabel: resolveMeasureLabel(result, chartSpec, measureField),
  };
}

function resolveCategoryField(
  result: QueryResult,
  chartSpec: ChartSpec | null,
) {
  const candidates = [
    chartSpec?.category_axis?.label,
    chartSpec?.category_axis?.field,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (result.columns.includes(candidate)) {
      return candidate;
    }
  }

  return result.columns.find((column) =>
    result.rows.some((row) => normalizeCategoryValue(row[column]) !== null),
  );
}

function resolveMeasureField(result: QueryResult, chartSpec: ChartSpec | null) {
  const primarySeries = chartSpec?.series[0];
  const candidates = [
    primarySeries?.label,
    primarySeries?.field,
    chartSpec?.value_axis?.label,
    chartSpec?.value_axis?.field,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (result.columns.includes(candidate)) {
      return candidate;
    }
  }

  return result.columns.find((column) =>
    result.rows.some((row) => normalizeNumericValue(row[column]) !== null),
  );
}

function resolveMeasureLabel(
  result: QueryResult,
  chartSpec: ChartSpec | null,
  fallbackField: string,
) {
  const primarySeries = chartSpec?.series[0];
  const candidates = [
    primarySeries?.label,
    chartSpec?.value_axis?.label,
    fallbackField,
  ].filter((value): value is string => Boolean(value));

  return (
    candidates.find((candidate) => result.columns.includes(candidate)) ??
    candidates[0] ??
    fallbackField
  );
}

function normalizeCategoryValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return null;
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export default QueryResultChart;
