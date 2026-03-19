use std::collections::HashMap;
use std::fs::File;
use std::path::Path;

use crate::semantic::QueryEngineError;

pub(crate) struct QueryDataset {
    pub headers: Vec<String>,
    pub rows: Vec<HashMap<String, String>>,
}

pub(crate) enum QueryPathKind {
    Csv,
    Parquet,
}

pub(crate) fn load_query_dataset(path: &str) -> Result<QueryDataset, QueryEngineError> {
    let path = Path::new(path);
    validate_query_path(path)?;

    let file =
        File::open(path).map_err(|_| QueryEngineError::FileNotFound(path.display().to_string()))?;
    let mut reader = csv::ReaderBuilder::new().flexible(true).from_reader(file);
    let headers = reader
        .headers()
        .map_err(|error| QueryEngineError::ParseFailed(error.to_string()))?
        .iter()
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();

    if headers.is_empty() {
        return Err(QueryEngineError::ParseFailed(
            "CSV file is missing a header row".to_string(),
        ));
    }

    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|error| QueryEngineError::ParseFailed(error.to_string()))?;
        let mut row = HashMap::with_capacity(headers.len());
        for (index, header) in headers.iter().enumerate() {
            row.insert(
                header.to_string(),
                record.get(index).unwrap_or_default().to_string(),
            );
        }
        rows.push(row);
    }

    Ok(QueryDataset { headers, rows })
}

pub(crate) fn detect_query_path_kind(path: &str) -> Result<QueryPathKind, QueryEngineError> {
    let path = Path::new(path);
    validate_query_path(path)?;
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("csv") => Ok(QueryPathKind::Csv),
        Some(extension) if extension.eq_ignore_ascii_case("parquet") => Ok(QueryPathKind::Parquet),
        _ => Err(QueryEngineError::UnsupportedFileType(
            path.display().to_string(),
        )),
    }
}

fn validate_query_path(path: &Path) -> Result<(), QueryEngineError> {
    if !path.exists() {
        return Err(QueryEngineError::FileNotFound(path.display().to_string()));
    }

    if !matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some(extension) if extension.eq_ignore_ascii_case("csv") || extension.eq_ignore_ascii_case("parquet")
    ) {
        return Err(QueryEngineError::UnsupportedFileType(
            path.display().to_string(),
        ));
    }

    Ok(())
}
