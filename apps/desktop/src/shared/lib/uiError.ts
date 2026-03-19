export interface BackendAppError {
  code?: string;
  message?: string;
  details?: string | null;
}

export interface UiErrorState {
  title: string;
  message: string;
  details?: string | null;
  code?: string | null;
}

export type UiErrorOperation =
  | "list_projects"
  | "load_data_source"
  | "warm_data_source_cache"
  | "profile_data_source"
  | "pick_file"
  | "save_project"
  | "import_project"
  | "export_project"
  | "export_query_result"
  | "open_project"
  | "run_query";
