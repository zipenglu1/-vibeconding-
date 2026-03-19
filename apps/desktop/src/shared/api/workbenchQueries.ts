import { useQuery } from "@tanstack/react-query";
import type { LoadedDataSource } from "@bi/ts-contracts";
import { listSavedProjects, suggestQueryConfigurations } from "./workbenchApi";

export function useSavedProjectsQuery() {
  return useQuery({
    queryKey: ["saved-projects"],
    queryFn: () => listSavedProjects(),
  });
}

export function useQueryRecommendationsQuery(
  activeDataSource: LoadedDataSource | null,
) {
  return useQuery({
    queryKey: [
      "query-recommendations",
      activeDataSource?.info.path ?? null,
      activeDataSource?.columns
        .map((column) => `${column.name}:${column.data_type}`)
        .join("|") ?? "",
    ],
    enabled: Boolean(activeDataSource),
    queryFn: () =>
      suggestQueryConfigurations(
        activeDataSource?.columns.map((column) => ({
          name: column.name,
          data_type: column.data_type,
        })) ?? [],
      ),
  });
}
