# End-to-End Tests

This directory now hosts the active desktop Playwright suite.

- `desktop.app.spec.ts` is the canonical browser-driven desktop regression suite.
- `pnpm -C apps/desktop e2e` resolves `apps/desktop/playwright.config.ts`, which now points its `testDir` at this root directory so CI and local runs use the documented AGENT.md location.
