# Shared API

Shared frontend API contracts and request helpers belong here.

`tauriBridge.ts` owns the low-level Tauri and dialog bridge, while workbench-facing modules
such as `workbenchApi.ts` wrap command names and payload shapes into reusable domain helpers.
`workbenchQueries.ts` layers React Query configuration on top of those helpers for the
workbench runtime and other page-level consumers.
