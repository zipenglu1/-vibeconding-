import type { AppLanguage } from "./appLanguage";
import { getWorkbenchCopy } from "./i18n";

export type WorkbenchStatusState =
  | string
  | {
      kind: "loadedDataSource";
      name: string;
      rows: number;
    }
  | {
      kind: "restoredDashboard";
      name: string;
    }
  | {
      kind: "dashboardViewAdded";
      name: string;
    }
  | {
      kind: "queryExecuted";
      name: string;
      rows: number;
    }
  | {
      kind: "openedDashboardView";
      name: string;
    };

export function resolveWorkbenchStatus(
  status: WorkbenchStatusState,
  language: AppLanguage,
): string {
  if (typeof status === "string") {
    return status;
  }

  const copy = getWorkbenchCopy(language);

  switch (status.kind) {
    case "loadedDataSource":
      return copy.actions.loadedDataSource(status.name, status.rows);
    case "restoredDashboard":
      return copy.actions.restoredDashboard(status.name);
    case "dashboardViewAdded":
      return copy.actions.dashboardViewAdded(status.name);
    case "queryExecuted":
      return copy.actions.queryExecuted(status.name, status.rows);
    case "openedDashboardView":
      return copy.actions.openedDashboardView(status.name);
    default:
      return "";
  }
}
