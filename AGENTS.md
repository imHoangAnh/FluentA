# Agent Instructions
- Read `README.md`, relevant `docs/`, and the Harness matrix before making changes.
- Respect existing contracts; do not change APIs, database schemas, or architecture without approval.
- Keep changes within the requested scope and preserve unrelated worktree changes.
- For cross-layer or migration work, update code, tests, and product documentation together.
- Run relevant tests and builds; clearly report pre-existing or unresolved failures.
- Do not use destructive Git commands, commit, or push unless explicitly requested.
- Stop and ask before making ambiguous, destructive, or compatibility-breaking changes.
- Your answer is too abstract. Please explain it with concrete examples and step-by-step cause and effect.

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTEXT_RULES.md`
- `scripts/bin/harness-cli query matrix` on macOS/Linux, or `.\scripts\bin\harness-cli.exe query matrix` on Windows

Use the Rust Harness CLI at `scripts/bin/harness-cli` on macOS/Linux or
`scripts/bin/harness-cli.exe` on Windows as the main operational tool.
<!-- HARNESS:END -->
