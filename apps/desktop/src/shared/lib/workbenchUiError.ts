import type {
  BackendAppError,
  UiErrorOperation,
  UiErrorState,
} from "./uiError";

export function toUiError(
  error: unknown,
  operation: UiErrorOperation,
): UiErrorState {
  const backendError = extractBackendError(error);
  const fallback = fallbackErrorContent(operation);
  const code = backendError?.code ?? null;

  if (!backendError) {
    return {
      title: fallback.title,
      message: fallback.message,
      details: extractLooseMessage(error),
      code,
    };
  }

  const content = backendErrorContent(backendError, operation);

  return {
    title: content.title,
    message: content.message,
    details: backendError.details ?? content.details ?? null,
    code,
  };
}

function fallbackErrorContent(operation: UiErrorOperation) {
  switch (operation) {
    case "load_data_source":
      return {
        title: "CSV load failed",
        message: "The selected CSV file could not be loaded.",
      };
    case "pick_file":
      return {
        title: "File selection failed",
        message: "The file picker could not be opened.",
      };
    case "warm_data_source_cache":
      return {
        title: "Cache warmup failed",
        message: "The selected data source cache could not be warmed.",
      };
    case "profile_data_source":
      return {
        title: "Data profiling failed",
        message: "The selected data source could not be profiled.",
      };
    case "save_project":
      return {
        title: "Project save failed",
        message: "The project metadata could not be saved.",
      };
    case "import_project":
      return {
        title: "Project import failed",
        message: "The selected project snapshot could not be imported.",
      };
    case "export_project":
      return {
        title: "Project export failed",
        message: "The current project snapshot could not be exported.",
      };
    case "export_query_result":
      return {
        title: "Result export failed",
        message: "The current query result could not be exported.",
      };
    case "open_project":
      return {
        title: "Project open failed",
        message: "The saved project metadata could not be restored.",
      };
    case "run_query":
      return {
        title: "Query execution failed",
        message: "The current semantic query could not be executed.",
      };
    case "list_projects":
    default:
      return {
        title: "Saved project list failed",
        message: "The saved project list could not be loaded.",
      };
  }
}

function backendErrorContent(
  error: BackendAppError,
  operation: UiErrorOperation,
) {
  switch (error.code) {
    case "data_source_not_found":
      return {
        title: "CSV file not found",
        message: "Choose an existing local CSV file before loading.",
        details: error.details,
      };
    case "data_source_invalid":
      return {
        title:
          operation === "import_project"
            ? "Project snapshot is invalid"
            : operation === "warm_data_source_cache"
              ? "Cache warmup is not available"
              : operation === "profile_data_source"
                ? "Data profiling is not available"
                : "CSV file is not valid",
        message:
          operation === "import_project"
            ? "The selected JSON file cannot be used as a project snapshot."
            : operation === "warm_data_source_cache"
              ? "This data source does not expose a Parquet cache artifact that can be warmed."
              : operation === "profile_data_source"
                ? "This data source does not expose a Parquet artifact that can be profiled."
                : "The selected file cannot be used as a CSV data source.",
        details: error.details,
      };
    case "data_source_load_failed":
      return {
        title: "CSV load failed",
        message: "The selected CSV file could not be parsed or opened.",
        details: error.details,
      };
    case "file_not_found":
      return {
        title:
          operation === "open_project"
            ? "Saved file is missing"
            : "Required file not found",
        message:
          operation === "open_project"
            ? "One of the files referenced by this saved project is no longer available."
            : "The requested file could not be found.",
        details: error.details,
      };
    case "file_write_error":
      return {
        title: "File write failed",
        message: "The application could not write the requested file.",
        details: error.details,
      };
    case "file_read_error":
      return {
        title:
          operation === "import_project"
            ? "Project snapshot could not be read"
            : "File read failed",
        message:
          operation === "import_project"
            ? "The application could not read the selected project snapshot or one of its referenced files."
            : "The application could not read the requested file.",
        details: error.details,
      };
    case "project_snapshot_invalid":
      return {
        title: "Project snapshot is invalid",
        message:
          "The selected JSON file does not match the expected project snapshot format.",
        details: error.details,
      };
    case "metadata_error":
    case "storage_error":
      return {
        title:
          operation === "save_project"
            ? "Project save failed"
            : "Project storage failed",
        message: "The local project metadata store returned an error.",
        details: error.details,
      };
    case "query_execution_error":
      return {
        title: "Query execution failed",
        message:
          "The current semantic query is invalid for the selected data source.",
        details: error.details,
      };
    case "query_parse_error":
      return {
        title: "Query payload is invalid",
        message:
          "The frontend built a query payload that the backend could not parse.",
        details: error.details,
      };
    case "internal_error":
      return {
        title: "Unexpected application error",
        message:
          error.message ??
          "The application returned an unexpected internal failure.",
        details: error.details,
      };
    default:
      return {
        title: fallbackErrorContent(operation).title,
        message: error.message ?? fallbackErrorContent(operation).message,
        details: error.details,
      };
  }
}

function extractBackendError(error: unknown): BackendAppError | null {
  if (isBackendAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const parsed = parseJsonError(error.message);
    if (parsed) {
      return parsed;
    }
  }

  if (typeof error === "string") {
    return parseJsonError(error);
  }

  return null;
}

function extractLooseMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
}

function parseJsonError(value: string): BackendAppError | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return isBackendAppError(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isBackendAppError(value: unknown): value is BackendAppError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as BackendAppError;
  return (
    typeof candidate.message === "string" || typeof candidate.code === "string"
  );
}
