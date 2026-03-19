import { useWorkbenchRuntime } from "../../shared/lib/useWorkbenchRuntime";
import WorkbenchShellWidget from "../shell/WorkbenchShellWidget";

function WorkbenchRuntimeWidget() {
  const { hero, workspaceProps, dashboardProps, showWorkspace, showDashboard } =
    useWorkbenchRuntime();

  return (
    <WorkbenchShellWidget
      hero={hero}
      workspaceProps={workspaceProps}
      dashboardProps={dashboardProps}
      onShowWorkspace={showWorkspace}
      onShowDashboard={showDashboard}
    />
  );
}

export default WorkbenchRuntimeWidget;
