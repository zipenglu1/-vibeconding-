import { Suspense, lazy } from "react";
import type { DashboardSectionId } from "@bi/ts-contracts";
import { Button, Panel, PanelHeader, SectionPanel } from "@bi/ui-kit";
import type { ChartVariant } from "../../../entities/chart/types";
import { normalizeDashboardLayout } from "../../../entities/dashboard/layout";
import type {
  DashboardMetric,
  DashboardViewModel,
} from "../../../entities/dashboard/types";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";
import QueryResultTable from "../../../shared/ui/QueryResultTable";
const QueryResultChart = lazy(() =>
  import("@bi/chart-presets").then((module) => ({
    default: module.QueryResultChart,
  })),
);

export interface AnalysisDashboardProps {
  dashboard: DashboardViewModel | null;
  chartVariant: ChartVariant;
  onChartVariantChange: (variant: ChartVariant) => void;
  onMoveSection: (
    sectionId: DashboardSectionId,
    direction: "up" | "down",
  ) => void;
  onToggleSectionSize: (sectionId: DashboardSectionId) => void;
}

function AnalysisDashboard({
  dashboard,
  chartVariant,
  onChartVariantChange,
  onMoveSection,
  onToggleSectionSize,
}: AnalysisDashboardProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);

  if (!dashboard) {
    return (
      <SectionPanel className="dashboard-panel">
        <PanelHeader
          title={copy.dashboard.title}
          meta={copy.dashboard.noAnalysisYet}
        />
        <p className="empty-state">{copy.dashboard.emptyState}</p>
      </SectionPanel>
    );
  }

  const { query, queryResult, title } = dashboard;
  const metrics = buildDashboardMetrics(dashboard, copy);
  const layout = normalizeDashboardLayout(dashboard.layout);

  return (
    <SectionPanel className="dashboard-panel">
      <PanelHeader title={copy.dashboard.title} meta={title} />

      <section className="dashboard-metrics">
        {metrics.map((metric) => (
          <Panel key={metric.label} className="metric-card">
            <span className="preview-label">{metric.label}</span>
            <strong>{metric.value}</strong>
          </Panel>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid-editable">
        {layout.sections?.map((section, index) => (
          <Panel
            key={section.id}
            className={`dashboard-section dashboard-section-${section.id} dashboard-section-${section.size}`}
          >
            <div className="dashboard-section-toolbar">
              <div className="dashboard-section-controls">
                <Button
                  variant="ghost"
                  onClick={() => onMoveSection(section.id, "up")}
                  disabled={index === 0}
                >
                  {copy.dashboard.up}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onMoveSection(section.id, "down")}
                  disabled={index === (layout.sections?.length ?? 0) - 1}
                >
                  {copy.dashboard.down}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onToggleSectionSize(section.id)}
                >
                  {section.size === "wide"
                    ? copy.dashboard.standardWidth
                    : copy.dashboard.wideWidth}
                </Button>
              </div>
            </div>
            {renderDashboardSection(
              section.id,
              query,
              queryResult,
              dashboard.chartSpec,
              chartVariant,
              onChartVariantChange,
              copy,
            )}
          </Panel>
        ))}
      </section>
    </SectionPanel>
  );
}

function renderDashboardSection(
  sectionId: DashboardSectionId,
  query: DashboardViewModel["query"],
  queryResult: DashboardViewModel["queryResult"],
  chartSpec: DashboardViewModel["chartSpec"],
  chartVariant: ChartVariant,
  onChartVariantChange: (variant: ChartVariant) => void,
  copy: ReturnType<typeof getWorkbenchCopy>,
) {
  switch (sectionId) {
    case "chart":
      return (
        <>
          <div className="chart-toolbar">
            <strong className="chart-title">{copy.dashboard.chart}</strong>
            <div className="chart-toggle-group">
              <Button
                variant={chartVariant === "bar" ? "default" : "ghost"}
                className={`chart-toggle${chartVariant === "bar" ? " active" : ""}`}
                onClick={() => onChartVariantChange("bar")}
              >
                {copy.dashboard.bar}
              </Button>
              <Button
                variant={chartVariant === "line" ? "default" : "ghost"}
                className={`chart-toggle${chartVariant === "line" ? " active" : ""}`}
                onClick={() => onChartVariantChange("line")}
              >
                {copy.dashboard.line}
              </Button>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="chart-surface chart-loading">
                <p className="empty-state">
                  {copy.dashboard.loadingChartRenderer}
                </p>
              </div>
            }
          >
            <QueryResultChart
              result={queryResult}
              chartSpec={chartSpec}
              variant={chartVariant}
            />
          </Suspense>
        </>
      );
    case "query":
      return (
        <>
          <PanelHeader
            title={copy.dashboard.querySpec}
            meta={copy.dashboard.dimensionsMeta(query.dimensions.length)}
          />
          <div className="query-summary-grid">
            <Panel className="query-summary-card">
              <span className="preview-label">Query name</span>
              <strong>{query.name}</strong>
            </Panel>
            <Panel className="query-summary-card">
              <span className="preview-label">Dimension</span>
              <strong>{formatQueryField(query.dimensions[0]?.alias, query.dimensions[0]?.field)}</strong>
            </Panel>
            <Panel className="query-summary-card">
              <span className="preview-label">Measure</span>
              <strong>
                {formatMeasureLabel(
                  query.measures[0]?.alias,
                  query.measures[0]?.field,
                  query.measures[0]?.aggregation,
                )}
              </strong>
            </Panel>
            <Panel className="query-summary-card">
              <span className="preview-label">Filter count</span>
              <strong>{String(query.filters?.length ?? 0)}</strong>
            </Panel>
            <Panel className="query-summary-card">
              <span className="preview-label">Sort</span>
              <strong>{formatSortLabel(query.sort?.[0]?.field, query.sort?.[0]?.direction)}</strong>
            </Panel>
            <Panel className="query-summary-card">
              <span className="preview-label">Row limit</span>
              <strong>{String(query.limit ?? queryResult.rows.length)}</strong>
            </Panel>
          </div>
        </>
      );
    case "table":
    default:
      return (
        <QueryResultTable
          title={copy.dashboard.resultTable}
          result={queryResult}
        />
      );
  }
}

function formatQueryField(alias?: string, field?: string) {
  return alias || field || "None";
}

function formatMeasureLabel(
  alias?: string,
  field?: string,
  aggregation?: string,
) {
  const baseLabel = formatQueryField(alias, field);
  if (!aggregation) {
    return baseLabel;
  }

  return `${aggregation} of ${baseLabel}`;
}

function formatSortLabel(field?: string, direction?: "asc" | "desc") {
  if (!field || !direction) {
    return "None";
  }

  return `${field} (${direction})`;
}

function buildDashboardMetrics(
  dashboard: DashboardViewModel,
  copy: ReturnType<typeof getWorkbenchCopy>,
): DashboardMetric[] {
  return [
    {
      label: copy.dashboard.dataSource,
      value: dashboard.activeDataSourceName ?? copy.dashboard.unknown,
    },
    {
      label: copy.dashboard.returnedRows,
      value: String(dashboard.queryResult.rows.length),
    },
    {
      label: copy.dashboard.columns,
      value: String(dashboard.queryResult.columns.length),
    },
    {
      label: copy.dashboard.execution,
      value: `${dashboard.queryResult.executionTimeMs} ms`,
    },
  ];
}

export default AnalysisDashboard;
