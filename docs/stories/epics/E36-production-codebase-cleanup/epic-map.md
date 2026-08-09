# E36 Epic Map

| Story | Responsibility | Depends on | Exit proof |
|---|---|---|---|
| US-CLEAN-001 | Baseline inventory and deterministic gates | — | Inventory, stable baseline tests, warning list |
| US-CLEAN-002 | Frontend orphan code and dependency retirement | 001 | Lint/type/test/build and feature smoke |
| US-CLEAN-003 | Backend endpoint and compatibility retirement | 001 | API diff, tests, 404 probes, smoke |
| US-CLEAN-004 | Final model cleanup and single EF baseline | 002, 003 | Empty DB baseline, schema inspection, no model drift |
| US-CLEAN-005 | Supported test and E2E contract repair | 003, 004 | Vitest, Playwright, current auth/route proof |
| US-CLEAN-006 | Final dependency/config/release proof | 005 | Full release gate and E34 handoff |

## Handoff

E36 does not claim production deployment readiness. It hands a cleaned,
validated codebase to `E34-production-deployment-cicd`.
