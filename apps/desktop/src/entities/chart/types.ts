import type { ChartVariant } from "@bi/chart-presets";
import type { QueryResult } from "@bi/ts-contracts";

export type { ChartVariant };

export interface ChartPreviewModel {
  variant: ChartVariant;
  result: QueryResult;
}
