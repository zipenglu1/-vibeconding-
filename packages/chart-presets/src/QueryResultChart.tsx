import { useEffect, useRef } from "react";
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

function QueryResultChart({ result, chartSpec, variant }: QueryResultChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    return () => {
      chart?.getEchartsInstance().dispose();
    };
  }, []);

  const chartModel = result ? createChartModel(result, chartSpec ?? null) : null;
  if (!chartModel) {
    return (
      <div className="chart-empty">
        <p className="empty-state">
          Run a query with one categorical column and one numeric value to render a chart.
        </p>
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: variant === "line" ? "line" : "shadow",
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
      axisLabel: {
        interval: 0,
        rotate: chartModel.categories.length > 4 ? 20 : 0,
      },
    },
    yAxis: {
      type: "value",
      name: chartModel.measureLabel,
    },
    series: [
      {
        name: chartModel.measureLabel,
        type: variant,
        data: chartModel.values,
        smooth: variant === "line",
        itemStyle: {
          color: "#1f5eff",
        },
        areaStyle:
          variant === "line"
            ? {
                color: "rgba(31, 94, 255, 0.12)",
              }
            : undefined,
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

function createChartModel(result: QueryResult, chartSpec: ChartSpec | null): ChartModel | null {
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
      category: row[categoryField],
      value: row[measureField],
    }))
    .filter(
      (point): point is { category: string; value: number } =>
        typeof point.category === "string" && typeof point.value === "number",
    );

  if (points.length === 0) {
    return null;
  }

  return {
    categories: points.map((point) => point.category),
    values: points.map((point) => point.value),
    measureLabel: measureField,
  };
}

function resolveCategoryField(result: QueryResult, chartSpec: ChartSpec | null) {
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
    result.rows.some((row) => typeof row[column] === "string"),
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
    result.rows.some((row) => typeof row[column] === "number"),
  );
}

export default QueryResultChart;
