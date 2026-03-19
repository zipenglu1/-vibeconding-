import QueryWorkspace, {
  type QueryWorkspaceProps,
} from "../../features/chart-builder/ui/QueryWorkspace";

function AnalysisWorkspaceWidget(props: QueryWorkspaceProps) {
  return <QueryWorkspace {...props} />;
}

export default AnalysisWorkspaceWidget;
