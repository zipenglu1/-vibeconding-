# App Layer

This directory is reserved for application bootstrap, routing, and top-level providers
to match the target frontend structure in `AGENT.md`.

The active desktop runtime now boots through this directory: `main.tsx` delegates
React root creation and provider wiring to `app/bootstrap.tsx` and `app/AppProviders.tsx`.
