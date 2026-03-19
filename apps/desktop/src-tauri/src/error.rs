#[cfg(feature = "desktop-runtime")]
use analytics_core::QueryEngineError;
#[cfg(feature = "desktop-runtime")]
use connectors::DataSourceLoaderError;
#[cfg(feature = "desktop-runtime")]
use export_runtime::ExportRuntimeError;
#[cfg(feature = "desktop-runtime")]
use metadata_store::MetadataStoreError;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    pub fn data_source_not_found(path: impl Into<String>) -> Self {
        let path = path.into();
        Self::new(
            "data_source_not_found",
            "The requested data source could not be found.",
            Some(path),
        )
    }

    pub fn data_source_load_failed(details: impl Into<String>) -> Self {
        Self::new(
            "data_source_load_failed",
            "The data source could not be loaded.",
            Some(details.into()),
        )
    }

    pub fn data_source_invalid(details: impl Into<String>) -> Self {
        Self::new(
            "data_source_invalid",
            "The selected data source is not valid for this operation.",
            Some(details.into()),
        )
    }

    pub fn query_parse(details: impl Into<String>) -> Self {
        Self::new(
            "query_parse_error",
            "The query payload could not be parsed.",
            Some(details.into()),
        )
    }

    pub fn query_execution(details: impl Into<String>) -> Self {
        Self::new(
            "query_execution_error",
            "The query could not be executed.",
            Some(details.into()),
        )
    }

    pub fn storage(details: impl Into<String>) -> Self {
        Self::new(
            "storage_error",
            "The application storage layer failed.",
            Some(details.into()),
        )
    }

    pub fn metadata(details: impl Into<String>) -> Self {
        Self::new(
            "metadata_error",
            "Project metadata could not be read or written.",
            Some(details.into()),
        )
    }

    pub fn project_snapshot_invalid(details: impl Into<String>) -> Self {
        Self::new(
            "project_snapshot_invalid",
            "The project snapshot is not valid.",
            Some(details.into()),
        )
    }

    pub fn file_not_found(path: impl Into<String>) -> Self {
        let path = path.into();
        Self::new(
            "file_not_found",
            "The required file was not found.",
            Some(path),
        )
    }

    pub fn file_read(details: impl Into<String>) -> Self {
        Self::new(
            "file_read_error",
            "The file could not be read.",
            Some(details.into()),
        )
    }

    pub fn file_write(details: impl Into<String>) -> Self {
        Self::new(
            "file_write_error",
            "The file could not be written.",
            Some(details.into()),
        )
    }

    pub fn internal(details: impl Into<String>) -> Self {
        Self::new(
            "internal_error",
            "The application hit an unexpected internal error.",
            Some(details.into()),
        )
    }

    pub fn not_implemented(details: impl Into<String>) -> Self {
        Self::new(
            "not_implemented",
            "This capability is not implemented yet.",
            Some(details.into()),
        )
    }

    fn new(code: &'static str, message: impl Into<String>, details: Option<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details,
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.details {
            Some(details) if !details.is_empty() => {
                write!(f, "{} [{}]: {}", self.message, self.code, details)
            }
            _ => write!(f, "{} [{}]", self.message, self.code),
        }
    }
}

impl std::error::Error for AppError {}

#[cfg(feature = "desktop-runtime")]
impl From<DataSourceLoaderError> for AppError {
    fn from(error: DataSourceLoaderError) -> Self {
        match error {
            DataSourceLoaderError::FileNotFound(path) => Self::data_source_not_found(path),
            DataSourceLoaderError::UnsupportedFileType(details) => {
                Self::data_source_invalid(details)
            }
            DataSourceLoaderError::MissingHeaders => {
                Self::data_source_invalid("The source file must include a header row.")
            }
            DataSourceLoaderError::MissingWorksheet(details) => Self::data_source_invalid(details),
            DataSourceLoaderError::MissingTable(details) => Self::data_source_invalid(details),
            DataSourceLoaderError::Cancelled => Self::data_source_load_failed(
                "The data source load was cancelled before completion.",
            ),
            DataSourceLoaderError::OpenFailed(details)
            | DataSourceLoaderError::ParseFailed(details) => Self::data_source_load_failed(details),
            DataSourceLoaderError::CacheWriteFailed(details) => Self::file_write(details),
        }
    }
}

#[cfg(feature = "desktop-runtime")]
impl From<QueryEngineError> for AppError {
    fn from(error: QueryEngineError) -> Self {
        match error {
            QueryEngineError::FileNotFound(path) => Self::file_not_found(path),
            QueryEngineError::UnsupportedFileType(details) => Self::data_source_invalid(details),
            QueryEngineError::EmptySelection => Self::query_execution(
                "Select at least one dimension or measure before running a query.",
            ),
            QueryEngineError::UnknownField(field) => {
                Self::query_execution(format!("Unknown field in query: {field}"))
            }
            QueryEngineError::InvalidFilterValue { field, reason } => {
                Self::query_execution(format!("Invalid filter for {field}: {reason}"))
            }
            QueryEngineError::InvalidAggregation { field, aggregation } => Self::query_execution(
                format!("Aggregation {aggregation} is not valid for field {field}."),
            ),
            QueryEngineError::InvalidSortField(field) => {
                Self::query_execution(format!("Sort field is invalid: {field}"))
            }
            QueryEngineError::ParseFailed(details) | QueryEngineError::ExecutionFailed(details) => {
                Self::query_execution(details)
            }
        }
    }
}

#[cfg(feature = "desktop-runtime")]
impl From<MetadataStoreError> for AppError {
    fn from(error: MetadataStoreError) -> Self {
        match error {
            MetadataStoreError::Database(details) => Self::metadata(details),
            MetadataStoreError::Serialization(details) => Self::metadata(details),
        }
    }
}

#[cfg(feature = "desktop-runtime")]
impl From<ExportRuntimeError> for AppError {
    fn from(error: ExportRuntimeError) -> Self {
        match error {
            ExportRuntimeError::EmptyPath => Self::file_write("Export path must not be empty."),
            ExportRuntimeError::Cancelled => {
                Self::file_write("The export job was cancelled before completion.")
            }
            ExportRuntimeError::ReadFailed(details) => Self::file_read(details),
            ExportRuntimeError::SerializeFailed(details)
            | ExportRuntimeError::WriteFailed(details) => Self::file_write(details),
            ExportRuntimeError::InvalidPayload(details) => Self::project_snapshot_invalid(details),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;
    #[cfg(feature = "desktop-runtime")]
    use analytics_core::QueryEngineError;
    #[cfg(feature = "desktop-runtime")]
    use connectors::DataSourceLoaderError;

    #[test]
    fn serializes_structured_error_fields() {
        let error = AppError::query_execution("Unknown field in query: revenue_total");
        let json = serde_json::to_value(&error).expect("error should serialize");

        assert_eq!(json["code"], "query_execution_error");
        assert_eq!(json["message"], "The query could not be executed.");
        assert_eq!(json["details"], "Unknown field in query: revenue_total");
    }

    #[cfg(feature = "desktop-runtime")]
    #[test]
    fn converts_loader_errors() {
        let error = AppError::from(DataSourceLoaderError::MissingHeaders);

        assert_eq!(error.code, "data_source_invalid");
        assert_eq!(
            error.message,
            "The selected data source is not valid for this operation."
        );
    }

    #[cfg(feature = "desktop-runtime")]
    #[test]
    fn converts_query_errors() {
        let error = AppError::from(QueryEngineError::UnknownField("region_name".to_string()));

        assert_eq!(error.code, "query_execution_error");
        assert!(error
            .details
            .as_deref()
            .expect("details should exist")
            .contains("region_name"));
    }
}
