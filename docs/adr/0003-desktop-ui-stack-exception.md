# ADR-0003: Accept a documented UI-stack exception instead of forcing a late shadcn/Radix rewrite

- Status: accepted
- Date: 2026-03-16

## Context

`AGENT.md` states that the frontend UI layer should use `shadcn/ui` based on Radix UI together with Tailwind CSS. The current repository already has:

- a Tailwind-based desktop frontend
- an active `components.json` compatible with the shadcn CLI schema
- a shared `packages/ui-kit` package consumed by the desktop app
- reusable primitives such as `Button`, `Input`, `Select`, `Panel`, and `ErrorBanner` already integrated across the workbench

However, the current `ui-kit` implementation is a custom lightweight primitive layer rather than generated shadcn components backed by Radix packages. Replacing the active workbench primitives late in the current phase would create broad UI churn without unlocking a near-term product capability.

## Decision

Accept a documented exception to the original `AGENT.md` requirement:

- keep Tailwind CSS as the enforced frontend styling baseline
- keep `components.json` and the existing package-oriented primitive structure as the current desktop UI foundation
- allow the active `packages/ui-kit` primitives to remain custom implementations for this product phase
- treat a future migration to generated shadcn/Radix components as optional product hardening work, not as a blocking architecture requirement

This ADR replaces the stricter "must use shadcn/ui + Radix UI" wording for the current repository state.

## Consequences

Positive:

- avoids high-churn UI rewrites that do not improve current product capabilities
- preserves the already extracted shared package boundary in `packages/ui-kit`
- keeps the desktop app aligned around one consistent primitive layer instead of mixing custom and generated component sets

Tradeoffs:

- the project now intentionally diverges from the original AGENT.md UI-library prescription
- future contributors must read this ADR before assuming a shadcn/Radix migration is still mandatory
- if richer accessibility or overlay primitives are needed later, adopting Radix-backed components may still become worthwhile
