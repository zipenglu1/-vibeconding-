import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChartSpec, DashboardLayoutMetadata } from "@bi/ts-contracts";
import type { ChartVariant } from "@bi/chart-presets";
import { normalizeDashboardLayout } from "../../entities/dashboard/layout";
import type { AppLanguage } from "./appLanguage";

export type ViewMode = "workspace" | "dashboard";

interface AppUiState {
  activeDataSourceId: string | null;
  chartVariant: ChartVariant;
  chartSpec: ChartSpec | null;
  viewMode: ViewMode;
  language: AppLanguage;
  dashboardLayout: DashboardLayoutMetadata;
  setActiveDataSourceId: (activeDataSourceId: string | null) => void;
  setChartVariant: (chartVariant: ChartVariant) => void;
  setChartSpec: (chartSpec: ChartSpec | null) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setDashboardLayout: (dashboardLayout: DashboardLayoutMetadata) => void;
}

export const useAppUiStore = create<AppUiState>()(
  persist(
    (set) => ({
      activeDataSourceId: null,
      chartVariant: "bar",
      chartSpec: null,
      viewMode: "workspace",
      language: "en",
      dashboardLayout: normalizeDashboardLayout(null),
      setActiveDataSourceId: (activeDataSourceId) => set({ activeDataSourceId }),
      setChartVariant: (chartVariant) => set({ chartVariant }),
      setChartSpec: (chartSpec) => set({ chartSpec }),
      setViewMode: (viewMode) => set({ viewMode }),
      setLanguage: (language) => set({ language }),
      setDashboardLayout: (dashboardLayout) =>
        set({ dashboardLayout: normalizeDashboardLayout(dashboardLayout) }),
    }),
    {
      name: "offline-bi-ui",
      partialize: (state) => ({
        language: state.language,
      }),
    },
  ),
);
