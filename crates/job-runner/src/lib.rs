use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct JobTiming {
    pub duration_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JobHandle {
    pub job_id: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JobSnapshot {
    pub job_id: String,
    pub kind: String,
    pub status: JobStatus,
    pub message: Option<String>,
    pub duration_ms: Option<u128>,
    pub completed: bool,
}

#[derive(Clone)]
pub struct JobRegistry {
    inner: Arc<Mutex<HashMap<String, JobRecord>>>,
    next_id: Arc<AtomicU64>,
}

#[derive(Clone)]
pub struct JobContext {
    job_id: String,
    inner: Arc<Mutex<HashMap<String, JobRecord>>>,
    cancel_token: Arc<AtomicBool>,
}

struct JobRecord {
    kind: String,
    status: JobStatus,
    message: Option<String>,
    started_at: Instant,
    finished_at: Option<Instant>,
    cancel_token: Arc<AtomicBool>,
}

pub fn run_sync_job<T, E, F>(operation: F) -> (Result<T, E>, JobTiming)
where
    F: FnOnce() -> Result<T, E>,
{
    let started_at = Instant::now();
    let result = operation();
    let timing = JobTiming {
        duration_ms: started_at.elapsed().as_millis(),
    };

    (result, timing)
}

impl Default for JobRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl JobRegistry {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
            next_id: Arc::new(AtomicU64::new(1)),
        }
    }

    pub fn spawn_tracked_job<F>(&self, kind: impl Into<String>, task: F) -> JobHandle
    where
        F: FnOnce(JobContext) -> Result<String, String> + Send + 'static,
    {
        let kind = kind.into();
        let job_id = format!("job-{}", self.next_id.fetch_add(1, Ordering::Relaxed));
        let cancel_token = Arc::new(AtomicBool::new(false));
        let handle = JobHandle {
            job_id: job_id.clone(),
            kind: kind.clone(),
        };

        {
            let mut jobs = self.inner.lock().expect("job registry lock should succeed");
            jobs.insert(
                job_id.clone(),
                JobRecord {
                    kind: kind.clone(),
                    status: JobStatus::Queued,
                    message: Some("Queued".to_string()),
                    started_at: Instant::now(),
                    finished_at: None,
                    cancel_token: cancel_token.clone(),
                },
            );
        }

        let inner = self.inner.clone();
        thread::spawn(move || {
            update_job(
                &inner,
                &job_id,
                JobStatus::Running,
                Some("Running".to_string()),
                None,
            );
            let context = JobContext {
                job_id: job_id.clone(),
                inner: inner.clone(),
                cancel_token: cancel_token.clone(),
            };

            let result = task(context.clone());
            if context.is_cancelled() {
                finish_job(
                    &inner,
                    &job_id,
                    JobStatus::Cancelled,
                    Some("Cancelled".to_string()),
                );
                return;
            }

            match result {
                Ok(message) => {
                    finish_job(&inner, &job_id, JobStatus::Succeeded, Some(message));
                }
                Err(message) => {
                    finish_job(&inner, &job_id, JobStatus::Failed, Some(message));
                }
            }
        });

        handle
    }

    pub fn snapshot(&self, job_id: &str) -> Option<JobSnapshot> {
        let jobs = self.inner.lock().ok()?;
        let job = jobs.get(job_id)?;
        let duration_ms = Some(
            job.finished_at
                .unwrap_or_else(Instant::now)
                .duration_since(job.started_at)
                .as_millis(),
        );

        Some(JobSnapshot {
            job_id: job_id.to_string(),
            kind: job.kind.clone(),
            status: job.status.clone(),
            message: job.message.clone(),
            duration_ms,
            completed: matches!(
                job.status,
                JobStatus::Succeeded | JobStatus::Failed | JobStatus::Cancelled
            ),
        })
    }

    pub fn cancel(&self, job_id: &str) -> bool {
        let mut jobs = match self.inner.lock() {
            Ok(guard) => guard,
            Err(_) => return false,
        };
        let Some(job) = jobs.get_mut(job_id) else {
            return false;
        };
        if matches!(
            job.status,
            JobStatus::Succeeded | JobStatus::Failed | JobStatus::Cancelled
        ) {
            return false;
        }

        job.cancel_token.store(true, Ordering::Relaxed);
        job.message = Some("Cancellation requested".to_string());
        true
    }
}

impl JobContext {
    pub fn job_id(&self) -> &str {
        &self.job_id
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel_token.load(Ordering::Relaxed)
    }

    pub fn checkpoint(&self) -> Result<(), String> {
        if self.is_cancelled() {
            Err("Cancelled".to_string())
        } else {
            Ok(())
        }
    }

    pub fn set_message(&self, message: impl Into<String>) {
        update_job(
            &self.inner,
            &self.job_id,
            JobStatus::Running,
            Some(message.into()),
            None,
        );
    }
}

fn update_job(
    inner: &Arc<Mutex<HashMap<String, JobRecord>>>,
    job_id: &str,
    status: JobStatus,
    message: Option<String>,
    finished_at: Option<Instant>,
) {
    if let Ok(mut jobs) = inner.lock() {
        if let Some(job) = jobs.get_mut(job_id) {
            job.status = status;
            if message.is_some() {
                job.message = message;
            }
            if finished_at.is_some() {
                job.finished_at = finished_at;
            }
        }
    }
}

fn finish_job(
    inner: &Arc<Mutex<HashMap<String, JobRecord>>>,
    job_id: &str,
    status: JobStatus,
    message: Option<String>,
) {
    update_job(inner, job_id, status, message, Some(Instant::now()));
}

#[cfg(test)]
mod tests {
    use super::{run_sync_job, JobRegistry, JobStatus};
    use std::thread;
    use std::time::Duration;

    #[test]
    fn tracks_successful_job_duration() {
        let (result, timing) = run_sync_job(|| Ok::<_, &'static str>(42));

        assert_eq!(result.expect("job should succeed"), 42);
        assert!(timing.duration_ms <= 1000);
    }

    #[test]
    fn tracks_background_job_completion() {
        let registry = JobRegistry::new();
        let handle = registry.spawn_tracked_job("export", |context| {
            context.set_message("Writing file");
            Ok("Finished export".to_string())
        });

        let snapshot = wait_for_completion(&registry, &handle.job_id);

        assert_eq!(snapshot.kind, "export");
        assert_eq!(snapshot.status, JobStatus::Succeeded);
        assert_eq!(snapshot.message.as_deref(), Some("Finished export"));
        assert!(snapshot.completed);
    }

    #[test]
    fn cancels_running_job() {
        let registry = JobRegistry::new();
        let handle = registry.spawn_tracked_job("export", |context| {
            for _ in 0..50 {
                context.checkpoint()?;
                thread::sleep(Duration::from_millis(5));
            }
            Ok("Finished export".to_string())
        });

        assert!(registry.cancel(&handle.job_id));
        let snapshot = wait_for_completion(&registry, &handle.job_id);

        assert_eq!(snapshot.status, JobStatus::Cancelled);
        assert!(snapshot.completed);
    }

    fn wait_for_completion(registry: &JobRegistry, job_id: &str) -> super::JobSnapshot {
        for _ in 0..100 {
            let snapshot = registry
                .snapshot(job_id)
                .expect("job snapshot should be available");
            if snapshot.completed {
                return snapshot;
            }
            thread::sleep(Duration::from_millis(10));
        }

        panic!("job did not complete in time");
    }
}
