use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MetadataStoreError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredQueryBuilderState {
    pub name: String,
    pub dimension_field: String,
    pub dimension_alias: String,
    pub measure_field: String,
    pub measure_alias: String,
    pub measure_aggregation: String,
    pub filter_enabled: bool,
    pub filter_field: String,
    pub filter_operator: String,
    pub filter_value: String,
    pub limit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredChartAxis {
    pub field: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredChartSeriesSpec {
    pub field: String,
    pub label: String,
    pub aggregation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredChartSpec {
    pub title: String,
    pub chart_type: String,
    pub category_axis: Option<StoredChartAxis>,
    pub value_axis: Option<StoredChartAxis>,
    pub series: Vec<StoredChartSeriesSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DashboardSectionLayout {
    pub id: String,
    pub size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DashboardLayoutMetadata {
    pub view_mode: String,
    pub chart_variant: String,
    #[serde(default = "default_dashboard_sections")]
    pub sections: Vec<DashboardSectionLayout>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DashboardState {
    pub query_builder: Option<StoredQueryBuilderState>,
    pub chart_spec: Option<StoredChartSpec>,
    pub layout: DashboardLayoutMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredDashboardView {
    pub id: String,
    pub name: String,
    pub data_source_path: Option<String>,
    pub dashboard_state: DashboardState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
struct PersistedDashboardState {
    #[serde(default)]
    pub active_dashboard_view_id: Option<String>,
    #[serde(default)]
    pub dashboard_views: Vec<StoredDashboardView>,
    #[serde(default)]
    pub dashboard_state: Option<DashboardState>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredDataSource {
    pub name: String,
    #[serde(rename = "type")]
    pub data_source_type: String,
    pub path: String,
    #[serde(default)]
    pub cache_path: Option<String>,
    pub tables: Vec<String>,
    pub total_rows: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub active_data_source_path: Option<String>,
    pub data_sources: Vec<StoredDataSource>,
    #[serde(default)]
    pub active_dashboard_view_id: Option<String>,
    #[serde(default)]
    pub dashboard_views: Vec<StoredDashboardView>,
    #[serde(default)]
    pub dashboard_state: Option<DashboardState>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub active_data_source_path: Option<String>,
}

pub struct MetadataStore {
    connection: Connection,
}

impl MetadataStore {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, MetadataStoreError> {
        let connection = Connection::open(path)
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }

    pub fn open_in_memory() -> Result<Self, MetadataStoreError> {
        let connection = Connection::open_in_memory()
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }

    pub fn save_project(&self, project: &ProjectMetadata) -> Result<(), MetadataStoreError> {
        let transaction = self
            .connection
            .unchecked_transaction()
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        transaction
            .execute(
                "INSERT INTO projects (id, name, active_data_source_path, dashboard_state_json)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   active_data_source_path = excluded.active_data_source_path,
                   dashboard_state_json = excluded.dashboard_state_json",
                params![
                    project.id,
                    project.name,
                    project.active_data_source_path,
                    serialize_dashboard_state(project)?
                ],
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        transaction
            .execute(
                "DELETE FROM data_sources WHERE project_id = ?1",
                params![project.id],
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        for data_source in &project.data_sources {
            let tables = serde_json::to_string(&data_source.tables)
                .map_err(|error| MetadataStoreError::Serialization(error.to_string()))?;

            transaction
                .execute(
                    "INSERT INTO data_sources (
                        project_id,
                        name,
                        data_source_type,
                        path,
                        cache_path,
                        tables_json,
                        total_rows
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        project.id,
                        data_source.name,
                        data_source.data_source_type,
                        data_source.path,
                        data_source.cache_path,
                        tables,
                        data_source.total_rows as i64
                    ],
                )
                .map_err(|error| MetadataStoreError::Database(error.to_string()))?;
        }

        transaction
            .commit()
            .map_err(|error| MetadataStoreError::Database(error.to_string()))
    }

    pub fn load_project(
        &self,
        project_id: &str,
    ) -> Result<Option<ProjectMetadata>, MetadataStoreError> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT id, name, active_data_source_path, dashboard_state_json
                 FROM projects
                 WHERE id = ?1",
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let project = statement
            .query_row(params![project_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            })
            .optional()
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let Some((id, name, active_data_source_path, dashboard_state_json)) = project else {
            return Ok(None);
        };

        let mut statement = self
            .connection
            .prepare(
                "SELECT name, data_source_type, path, cache_path, tables_json, total_rows
                 FROM data_sources
                 WHERE project_id = ?1
                 ORDER BY rowid ASC",
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let rows = statement
            .query_map(params![project_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let mut data_sources = Vec::new();
        for row in rows {
            let (name, data_source_type, path, cache_path, tables_json, total_rows) =
                row.map_err(|error| MetadataStoreError::Database(error.to_string()))?;
            let tables = serde_json::from_str::<Vec<String>>(&tables_json)
                .map_err(|error| MetadataStoreError::Serialization(error.to_string()))?;

            data_sources.push(StoredDataSource {
                name,
                data_source_type,
                path,
                cache_path,
                tables,
                total_rows: total_rows.max(0) as usize,
            });
        }

        let persisted_dashboard_state = deserialize_dashboard_state(dashboard_state_json)?;

        Ok(Some(ProjectMetadata {
            id,
            name,
            active_data_source_path,
            data_sources,
            active_dashboard_view_id: persisted_dashboard_state.active_dashboard_view_id,
            dashboard_views: persisted_dashboard_state.dashboard_views,
            dashboard_state: persisted_dashboard_state.dashboard_state,
        }))
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>, MetadataStoreError> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT id, name, active_data_source_path
                 FROM projects
                 ORDER BY name COLLATE NOCASE ASC, id ASC",
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let rows = statement
            .query_map([], |row| {
                Ok(ProjectSummary {
                    id: row.get::<_, String>(0)?,
                    name: row.get::<_, String>(1)?,
                    active_data_source_path: row.get::<_, Option<String>>(2)?,
                })
            })
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(row.map_err(|error| MetadataStoreError::Database(error.to_string()))?);
        }

        Ok(projects)
    }

    fn initialize(&self) -> Result<(), MetadataStoreError> {
        self.connection
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    active_data_source_path TEXT,
                    dashboard_state_json TEXT
                );

                CREATE TABLE IF NOT EXISTS data_sources (
                    project_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    data_source_type TEXT NOT NULL,
                    path TEXT NOT NULL,
                    cache_path TEXT,
                    tables_json TEXT NOT NULL,
                    total_rows INTEGER NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_data_sources_project_id
                    ON data_sources(project_id);",
            )
            .map_err(|error| MetadataStoreError::Database(error.to_string()))?;

        add_column_if_missing(
            &self.connection,
            "ALTER TABLE data_sources ADD COLUMN cache_path TEXT",
        )?;
        add_column_if_missing(
            &self.connection,
            "ALTER TABLE projects ADD COLUMN dashboard_state_json TEXT",
        )
    }
}

fn add_column_if_missing(connection: &Connection, sql: &str) -> Result<(), MetadataStoreError> {
    match connection.execute(sql, []) {
        Ok(_) => Ok(()),
        Err(rusqlite::Error::SqliteFailure(_, Some(message)))
            if message.contains("duplicate column name") =>
        {
            Ok(())
        }
        Err(error) => Err(MetadataStoreError::Database(error.to_string())),
    }
}

fn default_dashboard_sections() -> Vec<DashboardSectionLayout> {
    vec![
        DashboardSectionLayout {
            id: "chart".to_string(),
            size: "wide".to_string(),
        },
        DashboardSectionLayout {
            id: "query".to_string(),
            size: "standard".to_string(),
        },
        DashboardSectionLayout {
            id: "table".to_string(),
            size: "wide".to_string(),
        },
    ]
}

fn serialize_dashboard_state(
    project: &ProjectMetadata,
) -> Result<Option<String>, MetadataStoreError> {
    if project.dashboard_state.is_none()
        && project.dashboard_views.is_empty()
        && project.active_dashboard_view_id.is_none()
    {
        return Ok(None);
    }

    serde_json::to_string(&PersistedDashboardState {
        active_dashboard_view_id: project.active_dashboard_view_id.clone(),
        dashboard_views: project.dashboard_views.clone(),
        dashboard_state: project.dashboard_state.clone(),
    })
    .map(Some)
    .map_err(|error| MetadataStoreError::Serialization(error.to_string()))
}

fn deserialize_dashboard_state(
    dashboard_state_json: Option<String>,
) -> Result<PersistedDashboardState, MetadataStoreError> {
    let Some(json) = dashboard_state_json else {
        return Ok(PersistedDashboardState::default());
    };

    let value = serde_json::from_str::<serde_json::Value>(&json)
        .map_err(|error| MetadataStoreError::Serialization(error.to_string()))?;
    let uses_persisted_shape = value
        .as_object()
        .map(|object| {
            object.contains_key("active_dashboard_view_id")
                || object.contains_key("dashboard_views")
                || object.contains_key("dashboard_state")
        })
        .unwrap_or(false);

    if uses_persisted_shape {
        serde_json::from_value::<PersistedDashboardState>(value)
            .map_err(|error| MetadataStoreError::Serialization(error.to_string()))
    } else {
        serde_json::from_value::<DashboardState>(value)
            .map(|legacy_dashboard_state| PersistedDashboardState {
                active_dashboard_view_id: None,
                dashboard_views: Vec::new(),
                dashboard_state: Some(legacy_dashboard_state),
            })
            .map_err(|error| MetadataStoreError::Serialization(error.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        default_dashboard_sections, DashboardLayoutMetadata, DashboardSectionLayout,
        DashboardState, MetadataStore, ProjectMetadata, StoredChartAxis, StoredChartSeriesSpec,
        StoredChartSpec, StoredDashboardView, StoredDataSource, StoredQueryBuilderState,
    };
    use rusqlite::params;

    #[test]
    fn returns_none_for_missing_project() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");

        let loaded = store
            .load_project("missing-project")
            .expect("missing project query should succeed");

        assert!(loaded.is_none());
    }

    #[test]
    fn saves_and_loads_project_metadata() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");
        let project = sample_project();

        store
            .save_project(&project)
            .expect("project should be saved");

        let loaded = store
            .load_project(&project.id)
            .expect("project should load")
            .expect("project should exist");

        assert_eq!(loaded, project);
    }

    #[test]
    fn updates_existing_project_metadata() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");
        let mut project = sample_project();

        store
            .save_project(&project)
            .expect("project should be saved");

        project.name = "Updated BI Project".to_string();
        project.active_data_source_path = Some("E:\\data\\inventory.csv".to_string());
        project.data_sources = vec![StoredDataSource {
            name: "inventory".to_string(),
            data_source_type: "csv".to_string(),
            path: "E:\\data\\inventory.csv".to_string(),
            cache_path: Some("E:\\cache\\inventory.parquet".to_string()),
            tables: vec!["default".to_string()],
            total_rows: 84,
        }];

        store
            .save_project(&project)
            .expect("project should be updated");

        let loaded = store
            .load_project(&project.id)
            .expect("project should load")
            .expect("project should exist");

        assert_eq!(loaded, project);
    }

    #[test]
    fn loads_legacy_single_dashboard_state_payload() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");
        let legacy_dashboard_state = sample_dashboard_state();
        let legacy_dashboard_json = serde_json::to_string(&legacy_dashboard_state)
            .expect("legacy dashboard json should serialize");

        store
            .connection
            .execute(
                "INSERT INTO projects (id, name, active_data_source_path, dashboard_state_json)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    "legacy-project",
                    "Legacy Project",
                    "E:\\data\\sales.csv",
                    legacy_dashboard_json
                ],
            )
            .expect("legacy project should insert");

        let loaded = store
            .load_project("legacy-project")
            .expect("legacy project should load")
            .expect("legacy project should exist");

        assert!(loaded.dashboard_views.is_empty());
        assert!(loaded.active_dashboard_view_id.is_none());
        assert_eq!(loaded.dashboard_state, Some(legacy_dashboard_state));
    }

    #[test]
    fn lists_saved_projects() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");
        let first_project = sample_project();
        let second_project = ProjectMetadata {
            id: "project-002".to_string(),
            name: "Operations Review".to_string(),
            active_data_source_path: None,
            data_sources: vec![],
            active_dashboard_view_id: None,
            dashboard_views: vec![],
            dashboard_state: None,
        };

        store
            .save_project(&first_project)
            .expect("first project should be saved");
        store
            .save_project(&second_project)
            .expect("second project should be saved");

        let projects = store.list_projects().expect("projects should list");

        assert_eq!(projects.len(), 2);
        assert_eq!(projects[0].name, "Offline BI Project");
        assert_eq!(projects[1].name, "Operations Review");
    }

    #[test]
    fn lists_projects_case_insensitively_by_name() {
        let store = MetadataStore::open_in_memory().expect("in-memory db should open");
        let alpha = ProjectMetadata {
            id: "project-003".to_string(),
            name: "alpha".to_string(),
            active_data_source_path: None,
            data_sources: vec![],
            active_dashboard_view_id: None,
            dashboard_views: vec![],
            dashboard_state: None,
        };
        let beta = ProjectMetadata {
            id: "project-004".to_string(),
            name: "Beta".to_string(),
            active_data_source_path: None,
            data_sources: vec![],
            active_dashboard_view_id: None,
            dashboard_views: vec![],
            dashboard_state: None,
        };
        let gamma = ProjectMetadata {
            id: "project-005".to_string(),
            name: "gamma".to_string(),
            active_data_source_path: None,
            data_sources: vec![],
            active_dashboard_view_id: None,
            dashboard_views: vec![],
            dashboard_state: None,
        };

        store
            .save_project(&gamma)
            .expect("gamma project should save");
        store.save_project(&beta).expect("beta project should save");
        store
            .save_project(&alpha)
            .expect("alpha project should save");

        let projects = store.list_projects().expect("projects should list");
        let ordered_names = projects
            .into_iter()
            .map(|project| project.name)
            .collect::<Vec<_>>();

        assert_eq!(ordered_names, vec!["alpha", "Beta", "gamma"]);
    }

    fn sample_project() -> ProjectMetadata {
        ProjectMetadata {
            id: "project-001".to_string(),
            name: "Offline BI Project".to_string(),
            active_data_source_path: Some("E:\\data\\sales.csv".to_string()),
            data_sources: vec![
                StoredDataSource {
                    name: "sales".to_string(),
                    data_source_type: "csv".to_string(),
                    path: "E:\\data\\sales.csv".to_string(),
                    cache_path: Some("E:\\cache\\sales.parquet".to_string()),
                    tables: vec!["default".to_string()],
                    total_rows: 120,
                },
                StoredDataSource {
                    name: "customers".to_string(),
                    data_source_type: "csv".to_string(),
                    path: "E:\\data\\customers.csv".to_string(),
                    cache_path: Some("E:\\cache\\customers.parquet".to_string()),
                    tables: vec!["default".to_string()],
                    total_rows: 48,
                },
            ],
            active_dashboard_view_id: Some("dashboard-view-001".to_string()),
            dashboard_views: vec![
                StoredDashboardView {
                    id: "dashboard-view-001".to_string(),
                    name: "Revenue by Region".to_string(),
                    data_source_path: Some("E:\\data\\sales.csv".to_string()),
                    dashboard_state: sample_dashboard_state(),
                },
                StoredDashboardView {
                    id: "dashboard-view-002".to_string(),
                    name: "Revenue by Segment".to_string(),
                    data_source_path: Some("E:\\data\\sales.csv".to_string()),
                    dashboard_state: DashboardState {
                        query_builder: Some(StoredQueryBuilderState {
                            name: "Revenue by Segment".to_string(),
                            dimension_field: "segment".to_string(),
                            dimension_alias: "Segment".to_string(),
                            measure_field: "revenue".to_string(),
                            measure_alias: "total_revenue".to_string(),
                            measure_aggregation: "sum".to_string(),
                            filter_enabled: false,
                            filter_field: String::new(),
                            filter_operator: "eq".to_string(),
                            filter_value: String::new(),
                            limit: "25".to_string(),
                        }),
                        chart_spec: Some(StoredChartSpec {
                            title: "Revenue by Segment".to_string(),
                            chart_type: "bar".to_string(),
                            category_axis: Some(StoredChartAxis {
                                field: "segment".to_string(),
                                label: "Segment".to_string(),
                            }),
                            value_axis: Some(StoredChartAxis {
                                field: "total_revenue".to_string(),
                                label: "Revenue".to_string(),
                            }),
                            series: vec![StoredChartSeriesSpec {
                                field: "revenue".to_string(),
                                label: "Revenue".to_string(),
                                aggregation: "sum".to_string(),
                            }],
                        }),
                        layout: DashboardLayoutMetadata {
                            view_mode: "dashboard".to_string(),
                            chart_variant: "bar".to_string(),
                            sections: default_dashboard_sections(),
                        },
                    },
                },
            ],
            dashboard_state: Some(sample_dashboard_state()),
        }
    }

    fn sample_dashboard_state() -> DashboardState {
        DashboardState {
            query_builder: Some(StoredQueryBuilderState {
                name: "Revenue by Region".to_string(),
                dimension_field: "region".to_string(),
                dimension_alias: "Region".to_string(),
                measure_field: "revenue".to_string(),
                measure_alias: "total_revenue".to_string(),
                measure_aggregation: "sum".to_string(),
                filter_enabled: true,
                filter_field: "segment".to_string(),
                filter_operator: "eq".to_string(),
                filter_value: "Enterprise".to_string(),
                limit: "25".to_string(),
            }),
            chart_spec: Some(StoredChartSpec {
                title: "Revenue by Region".to_string(),
                chart_type: "bar".to_string(),
                category_axis: Some(StoredChartAxis {
                    field: "region".to_string(),
                    label: "Region".to_string(),
                }),
                value_axis: Some(StoredChartAxis {
                    field: "total_revenue".to_string(),
                    label: "Revenue".to_string(),
                }),
                series: vec![StoredChartSeriesSpec {
                    field: "revenue".to_string(),
                    label: "Revenue".to_string(),
                    aggregation: "sum".to_string(),
                }],
            }),
            layout: DashboardLayoutMetadata {
                view_mode: "dashboard".to_string(),
                chart_variant: "bar".to_string(),
                sections: vec![
                    DashboardSectionLayout {
                        id: "chart".to_string(),
                        size: "wide".to_string(),
                    },
                    DashboardSectionLayout {
                        id: "query".to_string(),
                        size: "standard".to_string(),
                    },
                    DashboardSectionLayout {
                        id: "table".to_string(),
                        size: "wide".to_string(),
                    },
                ],
            },
        }
    }
}
