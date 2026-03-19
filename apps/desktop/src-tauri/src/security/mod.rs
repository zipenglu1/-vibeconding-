#[cfg(feature = "desktop-runtime")]
use crate::AppError;
#[cfg(feature = "desktop-runtime")]
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
#[cfg(feature = "desktop-runtime")]
use std::path::PathBuf;
#[cfg(feature = "desktop-runtime")]
use tauri::{AppHandle, Manager};

#[cfg(feature = "desktop-runtime")]
pub fn build_cache_path(app: &AppHandle, source_path: &Path) -> Result<PathBuf, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::storage(error.to_string()))?;
    let cache_dir = app_data_dir.join("workspace").join("cache");
    fs::create_dir_all(&cache_dir).map_err(|error| AppError::file_write(error.to_string()))?;

    let file_name = format!(
        "{}-{}.parquet",
        sanitize_cache_stem(source_path),
        stable_path_hash(source_path)
    );
    Ok(cache_dir.join(file_name))
}

pub fn sanitize_cache_stem(source_path: &Path) -> String {
    source_path
        .file_stem()
        .or_else(|| source_path.file_name())
        .and_then(|value| value.to_str())
        .unwrap_or("data-source")
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

pub fn stable_path_hash(source_path: &Path) -> String {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source_path.to_string_lossy().hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

#[cfg(test)]
mod tests {
    use super::{sanitize_cache_stem, stable_path_hash};
    use std::path::Path;

    #[test]
    fn builds_workspace_cache_path_for_source_file() {
        let path = format!(
            "{}-{}.parquet",
            sanitize_cache_stem(Path::new("E:\\data files\\sales-data.csv")),
            stable_path_hash(Path::new("E:\\data files\\sales-data.csv"))
        );

        assert!(path.starts_with("sales-data-"));
        assert!(path.ends_with(".parquet"));
    }
}
