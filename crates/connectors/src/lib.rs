use calamine::{open_workbook_auto, Data, Reader};
use polars::io::SerReader;
use polars::prelude::{
    AnyValue, CsvReadOptions, DataFrame, DataType, ParquetReader, ParquetWriter, SchemaExt,
};
use rusqlite::types::ValueRef;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

const PREVIEW_ROW_LIMIT: usize = 20;

#[derive(Debug, Error)]
pub enum DataSourceLoaderError {
    #[error("Data source file does not exist: {0}")]
    FileNotFound(String),
    #[error("Unsupported data source file type: {0}")]
    UnsupportedFileType(String),
    #[error("Data source is missing a header row")]
    MissingHeaders,
    #[error("Excel workbook does not contain a readable worksheet: {0}")]
    MissingWorksheet(String),
    #[error("SQLite database does not contain a readable table: {0}")]
    MissingTable(String),
    #[error("Failed to open data source file: {0}")]
    OpenFailed(String),
    #[error("Failed to parse data source file: {0}")]
    ParseFailed(String),
    #[error("Failed to persist cache file: {0}")]
    CacheWriteFailed(String),
    #[error("The data source load was cancelled before completion.")]
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DataSourceInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub data_source_type: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_path: Option<String>,
    pub tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DataColumn {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LoadedDataSource {
    pub info: DataSourceInfo,
    pub columns: Vec<DataColumn>,
    pub preview_rows: Vec<HashMap<String, String>>,
    pub total_rows: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SourceFormat {
    Csv,
    Excel,
    Parquet,
    Sqlite,
}

struct LoadedSheetData {
    loaded: LoadedDataSource,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

struct LoadedSnapshotData {
    loaded: LoadedDataSource,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

pub struct DataSourceLoader;

impl DataSourceLoader {
    pub fn load(path: impl AsRef<Path>) -> Result<LoadedDataSource, DataSourceLoaderError> {
        match detect_source_format(path.as_ref())? {
            SourceFormat::Csv => Self::load_csv(path),
            SourceFormat::Excel => Self::load_excel(path),
            SourceFormat::Parquet => Self::load_parquet(path),
            SourceFormat::Sqlite => Self::load_sqlite(path),
        }
    }

    pub fn load_with_cache(
        path: impl AsRef<Path>,
        cache_path: impl AsRef<Path>,
    ) -> Result<LoadedDataSource, DataSourceLoaderError> {
        Self::load_with_cache_cancellable(path, cache_path, || false)
    }

    pub fn load_with_cache_cancellable<F>(
        path: impl AsRef<Path>,
        cache_path: impl AsRef<Path>,
        mut should_cancel: F,
    ) -> Result<LoadedDataSource, DataSourceLoaderError>
    where
        F: FnMut() -> bool,
    {
        let path = path.as_ref();
        let cache_path = cache_path.as_ref();

        match detect_source_format(path)? {
            SourceFormat::Csv => {
                Self::load_csv_with_cache_cancellable(path, cache_path, &mut should_cancel)
            }
            SourceFormat::Excel => {
                cancel_if_requested(&mut should_cancel)?;
                let mut loaded_sheet = load_excel_sheet(path)?;
                cancel_if_requested(&mut should_cancel)?;
                write_excel_parquet_cache(&loaded_sheet.headers, &loaded_sheet.rows, cache_path)?;
                loaded_sheet.loaded.info.cache_path = Some(cache_path.display().to_string());
                Ok(loaded_sheet.loaded)
            }
            SourceFormat::Parquet => Self::load_parquet(path),
            SourceFormat::Sqlite => {
                cancel_if_requested(&mut should_cancel)?;
                let mut loaded_snapshot = load_sqlite_snapshot(path)?;
                cancel_if_requested(&mut should_cancel)?;
                write_excel_parquet_cache(
                    &loaded_snapshot.headers,
                    &loaded_snapshot.rows,
                    cache_path,
                )?;
                loaded_snapshot.loaded.info.cache_path = Some(cache_path.display().to_string());
                Ok(loaded_snapshot.loaded)
            }
        }
    }

    pub fn load_csv(path: impl AsRef<Path>) -> Result<LoadedDataSource, DataSourceLoaderError> {
        let path = path.as_ref();
        validate_source_path(path, SourceFormat::Csv)?;

        let file = File::open(path)
            .map_err(|error| DataSourceLoaderError::OpenFailed(error.to_string()))?;
        let mut reader = csv::ReaderBuilder::new().flexible(true).from_reader(file);

        let headers = read_headers(&mut reader)?;

        let mut preview_rows = Vec::new();
        let mut column_samples: Vec<Vec<String>> = vec![Vec::new(); headers.len()];
        let mut total_rows = 0usize;

        for record in reader.records() {
            let record =
                record.map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;
            total_rows += 1;

            let mut row = HashMap::with_capacity(headers.len());
            for (index, header) in headers.iter().enumerate() {
                let value = record.get(index).unwrap_or_default().to_string();
                if column_samples[index].len() < PREVIEW_ROW_LIMIT && !value.trim().is_empty() {
                    column_samples[index].push(value.clone());
                }
                row.insert(header.to_string(), value);
            }

            if preview_rows.len() < PREVIEW_ROW_LIMIT {
                preview_rows.push(row);
            }
        }

        let columns = build_columns(&headers, &column_samples);

        Ok(LoadedDataSource {
            info: build_data_source_info(path, "csv", vec!["default".to_string()]),
            columns,
            preview_rows,
            total_rows,
        })
    }

    pub fn load_excel(path: impl AsRef<Path>) -> Result<LoadedDataSource, DataSourceLoaderError> {
        Ok(load_excel_sheet(path.as_ref())?.loaded)
    }

    pub fn load_parquet(path: impl AsRef<Path>) -> Result<LoadedDataSource, DataSourceLoaderError> {
        let path = path.as_ref();
        validate_source_path(path, SourceFormat::Parquet)?;

        let file = File::open(path)
            .map_err(|error| DataSourceLoaderError::OpenFailed(error.to_string()))?;
        let frame = ParquetReader::new(file)
            .finish()
            .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;

        build_loaded_parquet_source(path, frame)
    }

    pub fn load_sqlite(path: impl AsRef<Path>) -> Result<LoadedDataSource, DataSourceLoaderError> {
        Ok(load_sqlite_snapshot(path.as_ref())?.loaded)
    }

    pub fn load_csv_with_cache(
        path: impl AsRef<Path>,
        cache_path: impl AsRef<Path>,
    ) -> Result<LoadedDataSource, DataSourceLoaderError> {
        Self::load_csv_with_cache_cancellable(path, cache_path, || false)
    }

    pub fn load_csv_with_cache_cancellable<F>(
        path: impl AsRef<Path>,
        cache_path: impl AsRef<Path>,
        should_cancel: F,
    ) -> Result<LoadedDataSource, DataSourceLoaderError>
    where
        F: FnMut() -> bool,
    {
        let path = path.as_ref();
        let cache_path = cache_path.as_ref();

        let mut should_cancel = should_cancel;
        let mut loaded = load_csv_cancellable(path, &mut should_cancel)?;
        cancel_if_requested(&mut should_cancel)?;
        write_parquet_cache(path, cache_path)?;
        cancel_if_requested(&mut should_cancel)?;
        loaded.info.cache_path = Some(cache_path.display().to_string());

        Ok(loaded)
    }
}

fn detect_source_format(path: &Path) -> Result<SourceFormat, DataSourceLoaderError> {
    validate_existing_path(path)?;

    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("csv") => Ok(SourceFormat::Csv),
        Some(extension) if extension.eq_ignore_ascii_case("parquet") => Ok(SourceFormat::Parquet),
        Some(extension)
            if matches!(
                extension.to_ascii_lowercase().as_str(),
                "db" | "sqlite" | "sqlite3"
            ) =>
        {
            Ok(SourceFormat::Sqlite)
        }
        Some(extension)
            if matches!(
                extension.to_ascii_lowercase().as_str(),
                "xls" | "xlsx" | "xlsm" | "xlsb"
            ) =>
        {
            Ok(SourceFormat::Excel)
        }
        _ => Err(DataSourceLoaderError::UnsupportedFileType(
            path.display().to_string(),
        )),
    }
}

fn validate_existing_path(path: &Path) -> Result<(), DataSourceLoaderError> {
    if !path.exists() {
        return Err(DataSourceLoaderError::FileNotFound(
            path.display().to_string(),
        ));
    }

    Ok(())
}

fn validate_source_path(path: &Path, format: SourceFormat) -> Result<(), DataSourceLoaderError> {
    let detected = detect_source_format(path)?;
    if detected == format {
        Ok(())
    } else {
        Err(DataSourceLoaderError::UnsupportedFileType(
            path.display().to_string(),
        ))
    }
}

fn cancel_if_requested<F>(should_cancel: &mut F) -> Result<(), DataSourceLoaderError>
where
    F: FnMut() -> bool,
{
    if should_cancel() {
        Err(DataSourceLoaderError::Cancelled)
    } else {
        Ok(())
    }
}

fn load_csv_cancellable<F>(
    path: &Path,
    should_cancel: &mut F,
) -> Result<LoadedDataSource, DataSourceLoaderError>
where
    F: FnMut() -> bool,
{
    validate_source_path(path, SourceFormat::Csv)?;

    let file =
        File::open(path).map_err(|error| DataSourceLoaderError::OpenFailed(error.to_string()))?;
    let mut reader = csv::ReaderBuilder::new().flexible(true).from_reader(file);

    let headers = read_headers(&mut reader)?;

    let mut preview_rows = Vec::new();
    let mut column_samples: Vec<Vec<String>> = vec![Vec::new(); headers.len()];
    let mut total_rows = 0usize;

    for record in reader.records() {
        cancel_if_requested(should_cancel)?;
        let record =
            record.map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;
        total_rows += 1;

        let mut row = HashMap::with_capacity(headers.len());
        for (index, header) in headers.iter().enumerate() {
            let value = record.get(index).unwrap_or_default().to_string();
            if column_samples[index].len() < PREVIEW_ROW_LIMIT && !value.trim().is_empty() {
                column_samples[index].push(value.clone());
            }
            row.insert(header.to_string(), value);
        }

        if preview_rows.len() < PREVIEW_ROW_LIMIT {
            preview_rows.push(row);
        }
    }

    let columns = build_columns(&headers, &column_samples);

    Ok(LoadedDataSource {
        info: build_data_source_info(path, "csv", vec!["default".to_string()]),
        columns,
        preview_rows,
        total_rows,
    })
}

fn load_excel_sheet(path: &Path) -> Result<LoadedSheetData, DataSourceLoaderError> {
    validate_source_path(path, SourceFormat::Excel)?;

    let mut workbook = open_workbook_auto(path)
        .map_err(|error| DataSourceLoaderError::OpenFailed(error.to_string()))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let mut selected_sheet = None;
    for sheet_name in sheet_names {
        match workbook.worksheet_range(&sheet_name) {
            Ok(range) if !range.is_empty() => {
                selected_sheet = Some((sheet_name, range));
                break;
            }
            Ok(_) => continue,
            Err(error) => {
                return Err(DataSourceLoaderError::ParseFailed(error.to_string()));
            }
        }
    }

    let (sheet_name, range) = selected_sheet
        .ok_or_else(|| DataSourceLoaderError::MissingWorksheet(path.display().to_string()))?;

    let mut range_rows = range.rows();
    let header_row = range_rows
        .next()
        .ok_or(DataSourceLoaderError::MissingHeaders)?;
    let headers = normalize_headers(header_row)?;

    let mut rows = Vec::new();
    let mut preview_rows = Vec::new();
    let mut column_samples: Vec<Vec<String>> = vec![Vec::new(); headers.len()];

    for row in range_rows {
        let row_values = (0..headers.len())
            .map(|index| stringify_cell(row.get(index)))
            .collect::<Vec<_>>();

        for (index, value) in row_values.iter().enumerate() {
            if column_samples[index].len() < PREVIEW_ROW_LIMIT && !value.trim().is_empty() {
                column_samples[index].push(value.clone());
            }
        }

        if preview_rows.len() < PREVIEW_ROW_LIMIT {
            preview_rows.push(build_row_map(&headers, &row_values));
        }

        rows.push(row_values);
    }

    let columns = build_columns(&headers, &column_samples);
    let loaded = LoadedDataSource {
        info: build_data_source_info(path, "excel", vec![sheet_name]),
        columns,
        preview_rows,
        total_rows: rows.len(),
    };

    Ok(LoadedSheetData {
        loaded,
        headers,
        rows,
    })
}

fn load_sqlite_snapshot(path: &Path) -> Result<LoadedSnapshotData, DataSourceLoaderError> {
    validate_source_path(path, SourceFormat::Sqlite)?;

    let connection = Connection::open(path)
        .map_err(|error| DataSourceLoaderError::OpenFailed(error.to_string()))?;
    let table_name = first_sqlite_table(&connection, path)?;
    let headers = sqlite_headers(&connection, &table_name)?;
    let total_rows = sqlite_total_rows(&connection, &table_name)?;
    let rows = sqlite_rows(&connection, &table_name, None)?;
    let preview_rows = rows
        .iter()
        .take(PREVIEW_ROW_LIMIT)
        .map(|row| build_row_map(&headers, row))
        .collect::<Vec<_>>();
    let column_samples = collect_column_samples(&headers, &rows);
    let columns = build_columns(&headers, &column_samples);

    let loaded = LoadedDataSource {
        info: build_data_source_info(path, "sqlite", vec![table_name]),
        columns,
        preview_rows,
        total_rows,
    };

    Ok(LoadedSnapshotData {
        loaded,
        headers,
        rows,
    })
}

fn first_sqlite_table(
    connection: &Connection,
    path: &Path,
) -> Result<String, DataSourceLoaderError> {
    let mut statement = connection
        .prepare(
            "SELECT name
             FROM sqlite_master
             WHERE type = 'table'
               AND name NOT LIKE 'sqlite_%'
             ORDER BY name
             LIMIT 1",
        )
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;

    let table_name = statement
        .query_row([], |row| row.get::<_, String>(0))
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => {
                DataSourceLoaderError::MissingTable(path.display().to_string())
            }
            _ => DataSourceLoaderError::ParseFailed(error.to_string()),
        })?;

    Ok(table_name)
}

fn sqlite_headers(
    connection: &Connection,
    table_name: &str,
) -> Result<Vec<String>, DataSourceLoaderError> {
    let escaped_table_name = escape_sqlite_identifier(table_name);
    let pragma_sql = format!("PRAGMA table_info(\"{escaped_table_name}\")");
    let mut statement = connection
        .prepare(&pragma_sql)
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;
    let header_rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;

    let mut headers = Vec::new();
    for header in header_rows {
        headers
            .push(header.map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?);
    }

    if headers.is_empty() {
        return Err(DataSourceLoaderError::MissingHeaders);
    }

    Ok(headers)
}

fn sqlite_total_rows(
    connection: &Connection,
    table_name: &str,
) -> Result<usize, DataSourceLoaderError> {
    let escaped_table_name = escape_sqlite_identifier(table_name);
    let count_sql = format!("SELECT COUNT(*) FROM \"{escaped_table_name}\"");
    let total_rows = connection
        .query_row(&count_sql, [], |row| row.get::<_, i64>(0))
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;

    Ok(total_rows.max(0) as usize)
}

fn sqlite_rows(
    connection: &Connection,
    table_name: &str,
    limit: Option<usize>,
) -> Result<Vec<Vec<String>>, DataSourceLoaderError> {
    let escaped_table_name = escape_sqlite_identifier(table_name);
    let mut sql = format!("SELECT * FROM \"{escaped_table_name}\"");
    if let Some(limit) = limit {
        sql.push_str(&format!(" LIMIT {limit}"));
    }

    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;
    let column_count = statement.column_count();
    let mapped_rows = statement
        .query_map([], move |row| {
            let mut values = Vec::with_capacity(column_count);
            for index in 0..column_count {
                let value_ref = row.get_ref(index)?;
                values.push(stringify_sqlite_value(value_ref));
            }
            Ok(values)
        })
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;

    let mut rows = Vec::new();
    for row in mapped_rows {
        rows.push(row.map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?);
    }

    Ok(rows)
}

fn escape_sqlite_identifier(value: &str) -> String {
    value.replace('"', "\"\"")
}

fn stringify_sqlite_value(value: ValueRef<'_>) -> String {
    match value {
        ValueRef::Null => String::new(),
        ValueRef::Integer(value) => value.to_string(),
        ValueRef::Real(value) => value.to_string(),
        ValueRef::Text(value) => String::from_utf8_lossy(value).into_owned(),
        ValueRef::Blob(value) => format!("<blob:{} bytes>", value.len()),
    }
}

fn build_loaded_parquet_source(
    path: &Path,
    frame: DataFrame,
) -> Result<LoadedDataSource, DataSourceLoaderError> {
    let schema = frame.schema();
    let headers = schema
        .iter_names()
        .map(|name| name.to_string())
        .collect::<Vec<_>>();
    if headers.is_empty() {
        return Err(DataSourceLoaderError::MissingHeaders);
    }

    let columns = schema
        .iter_fields()
        .map(|field| DataColumn {
            name: field.name().to_string(),
            data_type: parquet_data_type_name(field.dtype()).to_string(),
        })
        .collect::<Vec<_>>();

    let preview_count = frame.height().min(PREVIEW_ROW_LIMIT);
    let preview_rows = (0..preview_count)
        .map(|row_index| build_parquet_preview_row(&frame, row_index))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(LoadedDataSource {
        info: build_data_source_info(path, "parquet", vec!["default".to_string()]),
        columns,
        preview_rows,
        total_rows: frame.height(),
    })
}

fn normalize_headers(header_row: &[Data]) -> Result<Vec<String>, DataSourceLoaderError> {
    let headers = header_row
        .iter()
        .enumerate()
        .map(|(index, value)| {
            let header = stringify_cell(Some(value)).trim().to_string();
            if header.is_empty() {
                format!("column_{}", index + 1)
            } else {
                header
            }
        })
        .collect::<Vec<_>>();

    if headers.is_empty() || headers.iter().all(|header| header.trim().is_empty()) {
        return Err(DataSourceLoaderError::MissingHeaders);
    }

    Ok(headers)
}

fn build_columns(headers: &[String], column_samples: &[Vec<String>]) -> Vec<DataColumn> {
    headers
        .iter()
        .enumerate()
        .map(|(index, header)| DataColumn {
            name: header.to_string(),
            data_type: infer_data_type(&column_samples[index]).to_string(),
        })
        .collect()
}

fn collect_column_samples(headers: &[String], rows: &[Vec<String>]) -> Vec<Vec<String>> {
    let mut column_samples = vec![Vec::new(); headers.len()];
    for row in rows.iter().take(PREVIEW_ROW_LIMIT) {
        for (index, value) in row.iter().enumerate() {
            if column_samples[index].len() < PREVIEW_ROW_LIMIT && !value.trim().is_empty() {
                column_samples[index].push(value.clone());
            }
        }
    }

    column_samples
}

fn build_row_map(headers: &[String], row_values: &[String]) -> HashMap<String, String> {
    let mut row = HashMap::with_capacity(headers.len());
    for (header, value) in headers.iter().zip(row_values.iter()) {
        row.insert(header.clone(), value.clone());
    }
    row
}

fn build_data_source_info(
    path: &Path,
    data_source_type: &str,
    tables: Vec<String>,
) -> DataSourceInfo {
    DataSourceInfo {
        name: file_stem_or_name(path),
        data_source_type: data_source_type.to_string(),
        path: path.display().to_string(),
        cache_path: None,
        tables,
    }
}

fn write_parquet_cache(source_path: &Path, cache_path: &Path) -> Result<(), DataSourceLoaderError> {
    let parent = cache_path.parent().ok_or_else(|| {
        DataSourceLoaderError::CacheWriteFailed(format!(
            "Cache path has no parent directory: {}",
            cache_path.display()
        ))
    })?;
    std::fs::create_dir_all(parent)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;

    let mut frame = CsvReadOptions::default()
        .with_has_header(true)
        .try_into_reader_with_file_path(Some(source_path.to_path_buf()))
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?
        .finish()
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;

    let file = File::create(cache_path)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;
    ParquetWriter::new(file)
        .finish(&mut frame)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;

    Ok(())
}

fn write_excel_parquet_cache(
    headers: &[String],
    rows: &[Vec<String>],
    cache_path: &Path,
) -> Result<(), DataSourceLoaderError> {
    let temp_csv_path = unique_temp_csv_path(cache_path);
    let write_result = write_csv_snapshot(&temp_csv_path, headers, rows)
        .and_then(|_| write_parquet_cache(&temp_csv_path, cache_path));
    let cleanup_result = std::fs::remove_file(&temp_csv_path);

    match (write_result, cleanup_result) {
        (Ok(()), Ok(())) | (Ok(()), Err(_)) => Ok(()),
        (Err(error), _) => Err(error),
    }
}

fn write_csv_snapshot(
    path: &Path,
    headers: &[String],
    rows: &[Vec<String>],
) -> Result<(), DataSourceLoaderError> {
    let parent = path.parent().ok_or_else(|| {
        DataSourceLoaderError::CacheWriteFailed(format!(
            "Temporary cache path has no parent directory: {}",
            path.display()
        ))
    })?;
    std::fs::create_dir_all(parent)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;

    let mut writer = csv::Writer::from_path(path)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;
    writer
        .write_record(headers)
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;
    for row in rows {
        writer
            .write_record(row)
            .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))?;
    }
    writer
        .flush()
        .map_err(|error| DataSourceLoaderError::CacheWriteFailed(error.to_string()))
}

fn unique_temp_csv_path(cache_path: &Path) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after unix epoch")
        .as_nanos();
    cache_path.with_extension(format!("excel-cache-{nanos}.csv"))
}

fn file_stem_or_name(path: &Path) -> String {
    path.file_stem()
        .or_else(|| path.file_name())
        .and_then(|value| value.to_str())
        .unwrap_or("data-source")
        .to_string()
}

fn stringify_cell(cell: Option<&Data>) -> String {
    match cell {
        Some(Data::String(value)) => value.clone(),
        Some(Data::Float(value)) => value.to_string(),
        Some(Data::Int(value)) => value.to_string(),
        Some(Data::Bool(value)) => value.to_string(),
        Some(Data::DateTime(value)) => value.to_string(),
        Some(Data::DateTimeIso(value)) => value.clone(),
        Some(Data::DurationIso(value)) => value.clone(),
        Some(Data::Error(value)) => value.to_string(),
        Some(Data::Empty) | None => String::new(),
    }
}

fn build_parquet_preview_row(
    frame: &DataFrame,
    row_index: usize,
) -> Result<HashMap<String, String>, DataSourceLoaderError> {
    let mut row = HashMap::with_capacity(frame.width());
    for series in frame.columns() {
        let value = series
            .get(row_index)
            .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?;
        row.insert(series.name().to_string(), stringify_any_value(value));
    }

    Ok(row)
}

fn stringify_any_value(value: AnyValue<'_>) -> String {
    match value {
        AnyValue::Null => String::new(),
        _ => {
            let stringified = value.to_string();
            stringified
                .strip_prefix('"')
                .and_then(|trimmed| trimmed.strip_suffix('"'))
                .unwrap_or(&stringified)
                .to_string()
        }
    }
}

fn parquet_data_type_name(dtype: &DataType) -> &'static str {
    match dtype {
        DataType::Boolean => "boolean",
        DataType::Int8
        | DataType::Int16
        | DataType::Int32
        | DataType::Int64
        | DataType::UInt8
        | DataType::UInt16
        | DataType::UInt32
        | DataType::UInt64 => "integer",
        DataType::Float32 | DataType::Float64 => "number",
        DataType::Date | DataType::Datetime(_, _) | DataType::Time | DataType::Duration(_) => {
            "date"
        }
        _ => "string",
    }
}

fn infer_data_type(samples: &[String]) -> &'static str {
    if samples.is_empty() {
        return "string";
    }

    if samples.iter().all(|value| value.parse::<i64>().is_ok()) {
        return "integer";
    }

    if samples.iter().all(|value| value.parse::<f64>().is_ok()) {
        return "number";
    }

    if samples.iter().all(|value| {
        matches!(
            value.to_ascii_lowercase().as_str(),
            "true" | "false" | "yes" | "no"
        )
    }) {
        return "boolean";
    }

    "string"
}

fn read_headers(reader: &mut csv::Reader<File>) -> Result<Vec<String>, DataSourceLoaderError> {
    let headers = reader
        .headers()
        .map_err(|error| DataSourceLoaderError::ParseFailed(error.to_string()))?
        .iter()
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();

    if headers.is_empty() {
        return Err(DataSourceLoaderError::MissingHeaders);
    }

    Ok(headers)
}

#[cfg(test)]
mod tests {
    use super::{infer_data_type, DataSourceLoader, DataSourceLoaderError};
    use polars::io::SerReader;
    use polars::prelude::ParquetReader;
    use rusqlite::Connection;
    use std::fs::{self, File};
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};
    use umya_spreadsheet::{new_file, writer::xlsx::write};

    #[test]
    fn loads_csv_and_builds_preview() {
        let path = unique_temp_file("loader-preview.csv");
        fs::write(
            &path,
            "city,population,coastal\nHong Kong,7500000,true\nShenzhen,17600000,false\n",
        )
        .expect("should create csv fixture");

        let loaded = DataSourceLoader::load_csv(&path).expect("csv should load");

        assert!(loaded.info.name.ends_with("loader-preview"));
        assert_eq!(loaded.info.data_source_type, "csv");
        assert_eq!(loaded.total_rows, 2);
        assert_eq!(loaded.columns.len(), 3);
        assert_eq!(loaded.columns[1].data_type, "integer");
        assert_eq!(loaded.preview_rows.len(), 2);
        assert_eq!(
            loaded.preview_rows[0].get("city").map(String::as_str),
            Some("Hong Kong")
        );

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn loads_excel_workbook_and_builds_preview() {
        let path = unique_temp_file("loader-preview.xlsx");
        write_test_workbook(
            &path,
            "Sheet1",
            &[
                &["city", "revenue"],
                &["Hong Kong", "120.5"],
                &["Shenzhen", "200"],
            ],
        );

        let loaded = DataSourceLoader::load(&path).expect("xlsx should load");

        assert!(loaded.info.name.ends_with("loader-preview"));
        assert_eq!(loaded.info.data_source_type, "excel");
        assert_eq!(loaded.info.tables, vec!["Sheet1"]);
        assert_eq!(loaded.total_rows, 2);
        assert_eq!(loaded.columns.len(), 2);
        assert_eq!(loaded.columns[1].data_type, "number");
        assert_eq!(
            loaded.preview_rows[0].get("city").map(String::as_str),
            Some("Hong Kong")
        );

        fs::remove_file(path).expect("should remove xlsx fixture");
    }

    #[test]
    fn parses_quoted_fields() {
        let path = unique_temp_file("loader-quotes.csv");
        fs::write(
            &path,
            "city,notes\n\"Hong Kong, SAR\",\"\"\"dense\"\" market\"\n",
        )
        .expect("should create csv fixture");

        let loaded = DataSourceLoader::load_csv(&path).expect("csv should load");

        assert_eq!(
            loaded.preview_rows[0].get("city").map(String::as_str),
            Some("Hong Kong, SAR")
        );
        assert_eq!(
            loaded.preview_rows[0].get("notes").map(String::as_str),
            Some("\"dense\" market")
        );

        fs::remove_file(path).expect("should remove csv fixture");
    }

    #[test]
    fn infers_boolean_and_number_column_types() {
        assert_eq!(
            infer_data_type(&["true".to_string(), "false".to_string(), "yes".to_string()]),
            "boolean"
        );
        assert_eq!(
            infer_data_type(&["12.5".to_string(), "8".to_string(), "0.25".to_string()]),
            "number"
        );
    }

    #[test]
    fn writes_parquet_cache_for_loaded_csv() {
        let source_path = unique_temp_file("loader-cache.csv");
        let cache_dir = unique_temp_dir("loader-cache");
        let cache_path = cache_dir.join("cached.parquet");
        fs::write(
            &source_path,
            "city,revenue\nHong Kong,120.5\nShenzhen,200\n",
        )
        .expect("should create csv fixture");

        let loaded = DataSourceLoader::load_csv_with_cache(&source_path, &cache_path)
            .expect("csv should load and cache");

        assert_eq!(
            loaded.info.cache_path.as_deref(),
            Some(cache_path.to_string_lossy().as_ref())
        );
        assert!(cache_path.exists());

        let parquet_file = File::open(&cache_path).expect("cache file should exist");
        let cached = ParquetReader::new(parquet_file)
            .finish()
            .expect("cache file should be readable");
        assert_eq!(cached.shape(), (2, 2));

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
        fs::remove_dir(cache_dir).expect("should remove cache dir");
    }

    #[test]
    fn writes_parquet_cache_for_loaded_excel() {
        let source_path = unique_temp_file("loader-cache.xlsx");
        let cache_dir = unique_temp_dir("loader-excel-cache");
        let cache_path = cache_dir.join("cached.parquet");
        write_test_workbook(
            &source_path,
            "Orders",
            &[
                &["city", "revenue"],
                &["Hong Kong", "120.5"],
                &["Shenzhen", "200"],
            ],
        );

        let loaded = DataSourceLoader::load_with_cache(&source_path, &cache_path)
            .expect("xlsx should load and cache");

        assert_eq!(loaded.info.data_source_type, "excel");
        assert_eq!(loaded.info.tables, vec!["Orders"]);
        assert_eq!(
            loaded.info.cache_path.as_deref(),
            Some(cache_path.to_string_lossy().as_ref())
        );
        assert!(cache_path.exists());

        let parquet_file = File::open(&cache_path).expect("cache file should exist");
        let cached = ParquetReader::new(parquet_file)
            .finish()
            .expect("cache file should be readable");
        assert_eq!(cached.shape(), (2, 2));

        fs::remove_file(source_path).expect("should remove xlsx fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
        fs::remove_dir(cache_dir).expect("should remove cache dir");
    }

    #[test]
    fn loads_direct_parquet_and_builds_preview() {
        let source_path = unique_temp_file("loader-source.csv");
        let cache_dir = unique_temp_dir("loader-direct-parquet");
        let parquet_path = cache_dir.join("source.parquet");
        fs::write(
            &source_path,
            "city,revenue,won\nHong Kong,120.5,true\nShenzhen,200,false\n",
        )
        .expect("should create csv fixture");
        DataSourceLoader::load_csv_with_cache(&source_path, &parquet_path)
            .expect("csv should create parquet fixture");

        let loaded = DataSourceLoader::load(&parquet_path).expect("parquet should load");

        assert_eq!(loaded.info.data_source_type, "parquet");
        assert_eq!(loaded.info.path, parquet_path.to_string_lossy());
        assert!(loaded.info.cache_path.is_none());
        assert_eq!(loaded.total_rows, 2);
        assert_eq!(loaded.columns.len(), 3);
        assert_eq!(loaded.columns[1].data_type, "number");
        assert_eq!(loaded.columns[2].data_type, "boolean");
        assert_eq!(
            loaded.preview_rows[0].get("city").map(String::as_str),
            Some("Hong Kong")
        );

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_file(parquet_path).expect("should remove parquet fixture");
        fs::remove_dir(cache_dir).expect("should remove parquet dir");
    }

    #[test]
    fn loads_sqlite_snapshot_and_writes_cache() {
        let source_path = unique_temp_file("loader-source.sqlite");
        let cache_dir = unique_temp_dir("loader-sqlite-cache");
        let cache_path = cache_dir.join("snapshot.parquet");
        write_test_sqlite_db(&source_path);

        let loaded = DataSourceLoader::load_with_cache(&source_path, &cache_path)
            .expect("sqlite snapshot should load and cache");

        assert_eq!(loaded.info.data_source_type, "sqlite");
        assert_eq!(loaded.info.tables, vec!["orders"]);
        assert_eq!(
            loaded.info.cache_path.as_deref(),
            Some(cache_path.to_string_lossy().as_ref())
        );
        assert_eq!(loaded.total_rows, 2);
        assert_eq!(loaded.columns.len(), 3);
        assert_eq!(
            loaded.preview_rows[0].get("city").map(String::as_str),
            Some("Hong Kong")
        );
        assert!(cache_path.exists());

        fs::remove_file(source_path).expect("should remove sqlite fixture");
        fs::remove_file(cache_path).expect("should remove parquet cache");
        fs::remove_dir(cache_dir).expect("should remove cache dir");
    }

    #[test]
    fn cancels_csv_cache_materialization_before_completion() {
        let source_path = unique_temp_file("loader-cancel.csv");
        let cache_dir = unique_temp_dir("loader-cancel-cache");
        let cache_path = cache_dir.join("cancelled.parquet");
        let mut csv = String::from("city,revenue\n");
        for row_index in 0..200 {
            csv.push_str(&format!("City {row_index},{}\n", row_index * 10));
        }
        fs::write(&source_path, csv).expect("should create csv fixture");

        let mut poll_count = 0usize;
        let error =
            DataSourceLoader::load_with_cache_cancellable(&source_path, &cache_path, || {
                poll_count += 1;
                poll_count > 3
            })
            .expect_err("load should be cancelled");

        assert!(matches!(error, DataSourceLoaderError::Cancelled));
        assert!(!cache_path.exists());

        fs::remove_file(source_path).expect("should remove csv fixture");
        fs::remove_dir(cache_dir).expect("should remove cache dir");
    }

    fn unique_temp_file(file_name: &str) -> PathBuf {
        unique_temp_dir("connectors-tests").join(file_name)
    }

    fn unique_temp_dir(label: &str) -> PathBuf {
        let base = std::env::temp_dir();
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        let dir = base.join(format!("offline-desktop-bi-{label}-{nanos}"));
        fs::create_dir_all(&dir).expect("temporary directory should be created");
        dir
    }

    fn write_test_workbook(path: &Path, sheet_name: &str, rows: &[&[&str]]) {
        let mut workbook = new_file();
        let default_sheet = workbook
            .get_sheet_by_name_mut("Sheet1")
            .expect("default sheet should exist");
        default_sheet.set_name(sheet_name);

        let sheet = workbook
            .get_sheet_by_name_mut(sheet_name)
            .expect("renamed sheet should exist");

        for (row_index, row) in rows.iter().enumerate() {
            for (column_index, value) in row.iter().enumerate() {
                sheet
                    .get_cell_mut(((column_index + 1) as u32, (row_index + 1) as u32))
                    .set_value((*value).to_string());
            }
        }

        write(&workbook, path).expect("xlsx fixture should be written");
    }

    fn write_test_sqlite_db(path: &Path) {
        let connection = Connection::open(path).expect("sqlite fixture should open");
        connection
            .execute_batch(
                "CREATE TABLE orders (
                    city TEXT NOT NULL,
                    revenue REAL NOT NULL,
                    won INTEGER NOT NULL
                );
                INSERT INTO orders (city, revenue, won) VALUES
                    ('Hong Kong', 120.5, 1),
                    ('Shenzhen', 200, 0);",
            )
            .expect("sqlite fixture should be initialized");
    }

    #[allow(dead_code)]
    fn path_to_string(path: &Path) -> String {
        path.to_string_lossy().into_owned()
    }
}
