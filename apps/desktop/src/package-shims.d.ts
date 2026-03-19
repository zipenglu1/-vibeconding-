declare module "@bi/ui-kit" {
  export { default as Badge } from "../../packages/ui-kit/src/Badge";
  export { default as Button } from "../../packages/ui-kit/src/Button";
  export { Card, CardContent } from "../../packages/ui-kit/src/Card";
  export { default as ErrorBanner } from "./shared/ui/ErrorBanner";
  export { default as Input } from "../../packages/ui-kit/src/Input";
  export {
    AppShell,
    LayoutGrid,
    Panel,
    PanelHeader,
    SectionPanel,
  } from "./shared/ui/AppLayout";
  export { default as Select } from "../../packages/ui-kit/src/Select";
  export type {
    SelectOption,
    SelectProps,
  } from "../../packages/ui-kit/src/Select";
}

declare module "@bi/chart-presets" {
  export { default as QueryResultChart } from "./shared/charts/QueryResultChart";
  export type { ChartVariant } from "./shared/charts/QueryResultChart";
}
