# Integration Tests

This workspace crate contains cross-crate smoke tests for the implemented offline desktop BI flows.

- `tests/offline_flows.rs`: validates cached-query execution and snapshot export flows across the current workspace crates.
- `cached_query_perf_regression_guard`: ignored-by-default release-path performance guard for cached Parquet query execution, intended to be run through `scripts/dev/run-cached-query-perf.ps1`.
