use analytics_core::DataSourceProfile;
use connectors::LoadedDataSource;
use job_runner::JobRegistry;
use metadata_store::MetadataStore;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct MetadataStoreState {
    pub store: Mutex<MetadataStore>,
}

pub struct JobRegistryState {
    pub jobs: JobRegistry,
}

pub struct LoadDataSourceJobResultsState {
    pub results: Arc<Mutex<HashMap<String, LoadedDataSource>>>,
}

pub struct ProfileDataSourceJobResultsState {
    pub results: Arc<Mutex<HashMap<String, DataSourceProfile>>>,
}
