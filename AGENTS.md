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

Start with the requested outcome, then use the repository as the system of
record. Read `docs/WORKFLOW.md` and only relevant product, design, plan, code,
and validation material.

- Answers, explanations, reviews, diagnoses, plans, and status reports are
  read-only. Inspect only what is needed and do not mutate repository or Harness
  state.
- For a bounded change, use an ephemeral plan: inspect the affected behavior and
  proof, implement, and validate. No control-plane operation is required.
- Create or update one file under `docs/plans/active/` when work spans sessions,
  needs coordination, has meaningful dependencies, or requires recovery steps.
  Move it to `docs/plans/completed/` only after validation.
- Before editing, identify repository authority for each new externally
  observable policy. If materially different choices remain open, stop before
  edits; configurable defaults are not authority.
- Report reusable agent friction. Change guidance, tools, runbooks, or validation
  for that purpose only when explicitly asked to use `$improve-harness`.
- Also pause when product intent remains ambiguous, recovery is difficult,
  validation is weakened, or authority is insufficient.
- Claim completion only with relevant executable or observable evidence. Report
  the outcome, important changes, validation, and unresolved risks.

SQLite intake, story, trace, scoring, audit, and proposal commands are optional
compatibility features. Use them only when explicitly requested or required by
an external orchestrator.
<!-- HARNESS:END -->
