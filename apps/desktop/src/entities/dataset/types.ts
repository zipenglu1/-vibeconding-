export type { DataColumn, LoadedDataSource } from "@bi/ts-contracts";
import type { LoadedDataSource } from "@bi/ts-contracts";

export interface DataSourceEntry {
  id: string;
  loaded: LoadedDataSource;
}
