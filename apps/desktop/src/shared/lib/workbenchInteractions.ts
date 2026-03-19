import type {
  ChartSpec,
  DashboardLayoutMetadata,
  DashboardSectionId,
} from "@bi/ts-contracts";
import type { DataSourceEntry } from "../../entities/dataset/types";
import type { ChartVariant } from "../../entities/chart/types";
import {
  moveDashboardSection,
  normalizeDashboardLayout,
  toggleDashboardSectionSize,
} from "../../entities/dashboard/layout";
import type { QueryBuilderState } from "../../entities/field/types";
import { logFrontendEvent } from "./frontendLogger";
import type { UiErrorState } from "./uiError";
import type { ViewMode } from "./appUiStore";

type SetState<T> = (value: T | ((current: T) => T)) => void;

interface WorkbenchInteractionDeps {
  chartSpec: ChartSpec | null;
  setActiveDataSourceId: (value: string | null) => void;
  setPath: SetState<string>;
  setError: SetState<UiErrorState | null>;
  setQueryBuilder: SetState<QueryBuilderState>;
  setChartVariant: (value: ChartVariant) => void;
  setChartSpec: (value: ChartSpec | null) => void;
  setViewMode: (value: ViewMode) => void;
  dashboardLayout: DashboardLayoutMetadata;
  setDashboardLayout: (value: DashboardLayoutMetadata) => void;
}

export function createWorkbenchInteractions({
  chartSpec,
  setActiveDataSourceId,
  setPath,
  setError,
  setQueryBuilder,
  setChartVariant,
  setChartSpec,
  setViewMode,
  dashboardLayout,
  setDashboardLayout,
}: WorkbenchInteractionDeps) {
  function activateDataSource(entry: DataSourceEntry) {
    logFrontendEvent("activate_data_source", "change", {
      data_source_id: entry.id,
      data_source_name: entry.loaded.info.name,
    });
    setActiveDataSourceId(entry.id);
    setPath(entry.loaded.info.path);
    setError(null);
  }

  function updateQueryBuilder<K extends keyof QueryBuilderState>(
    key: K,
    value: QueryBuilderState[K],
  ) {
    logFrontendEvent("query_builder", "change", {
      field: key,
      value:
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number"
          ? value
          : String(value),
    });
    setQueryBuilder((current) => ({ ...current, [key]: value }));
  }

  function changeChartVariant(variant: ChartVariant) {
    logFrontendEvent("chart_variant", "change", {
      variant,
    });
    setChartVariant(variant);
    if (chartSpec) {
      setChartSpec({
        ...chartSpec,
        chart_type: variant,
      });
    }
  }

  function showWorkspace() {
    logFrontendEvent("view_mode_toggle", "change", {
      next_view_mode: "workspace",
    });
    setViewMode("workspace");
  }

  function showDashboard() {
    logFrontendEvent("view_mode_toggle", "change", {
      next_view_mode: "dashboard",
    });
    setViewMode("dashboard");
  }

  function moveLayoutSection(
    sectionId: DashboardSectionId,
    direction: "up" | "down",
  ) {
    const normalized = normalizeDashboardLayout(dashboardLayout);
    const nextLayout = {
      ...normalized,
      sections: moveDashboardSection(
        normalized.sections ?? [],
        sectionId,
        direction,
      ),
    };
    setDashboardLayout(nextLayout);
    logFrontendEvent("dashboard_layout", "change", {
      action: "move",
      section_id: sectionId,
      direction,
    });
  }

  function toggleLayoutSectionSize(sectionId: DashboardSectionId) {
    const normalized = normalizeDashboardLayout(dashboardLayout);
    const nextLayout = {
      ...normalized,
      sections: toggleDashboardSectionSize(
        normalized.sections ?? [],
        sectionId,
      ),
    };
    setDashboardLayout(nextLayout);
    logFrontendEvent("dashboard_layout", "change", {
      action: "resize",
      section_id: sectionId,
    });
  }

  return {
    activateDataSource,
    updateQueryBuilder,
    changeChartVariant,
    showWorkspace,
    showDashboard,
    moveLayoutSection,
    toggleLayoutSectionSize,
  };
}
