# ADR-0002: Desktop Backend Module Boundaries

- Status: accepted
- Date: 2026-03-15

## Context

The desktop backend originally concentrated command handlers, startup logic, state, helper functions, and tests in a monolithic `apps/desktop/src-tauri/src/lib.rs`. `AGENT.md` defines a clearer target boundary for the Tauri runtime:

- `commands`
- `app_state`
- `bootstrap`
- `services`
- `security`

The project needed this split without changing the command surface already used by the frontend.

## Decision

Organize the desktop backend as follows:

- `src/commands`: all frontend-callable Tauri commands and their command-local orchestration
- `src/app_state`: long-lived application state such as the managed metadata store handle
- `src/bootstrap`: Tauri builder creation, plugin setup, state registration, and invoke handler wiring
- `src/services`: reusable backend helpers for metadata store opening and structured failure emission
- `src/security`: workspace cache path generation and path sanitization helpers used by import flows
- `src/lib.rs`: only module exports, shared error export, and the `run()` entrypoint

Keep `error.rs` as the shared application error contract used across the module boundaries.

## Consequences

Positive:

- the command boundary is explicit and easier to extend safely
- startup wiring and state management are no longer mixed into command handlers
- future security and service concerns now have dedicated modules instead of ad hoc helpers

Tradeoffs:

- desktop validation still requires warming the heavy analytics dependency chain before the crate completes quickly on Windows/MSVC
- the current backend surface is still synchronous and intentionally small; later background-job expansion should build on these boundaries instead of bypassing them
