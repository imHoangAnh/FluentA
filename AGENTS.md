# Agent Instructions

<!-- HARNESS:BEGIN -->
## Harness

Start with the requested outcome; the repository is the system of record.
Read `docs/WORKFLOW.md`; use `$agent-spawn` for change-phase delegation.
Inspect only relevant repository evidence.

- Answers, explanations, reviews, diagnoses, plans, and status reports are
  read-only; change nothing.
- For a bounded change, inspect affected behavior and proof, implement, and
  validate. No control-plane operation is required.
- Use one `docs/plans/active/` file when work spans sessions, needs durable
  coordination, has dependencies, or needs recovery. Move it to
  `docs/plans/completed/` only after validation.
- Before editing, identify repository authority for each new externally
  observable policy. If policy choices remain open, stop before
  edits; configurable defaults are not authority.
- For architecture, reliability, security, or quality invariant work, read
  `docs/patterns/encoding-invariants.md` and enforce only accepted rules.
- Report reusable agent friction; change Harness for that purpose only when
  explicitly asked to use `$improve-harness`.
- Also pause when product intent remains ambiguous, recovery is difficult,
  validation is weakened, or authority is insufficient.
- Report outcome, changes, executable or observable proof, and unresolved risks.
- Use plain language and concrete examples: "reject duplicate payments", not "improve reliability".

Harness has no task database or orchestration lifecycle. Use repository plans
and behavior-level proof, not parallel state.
<!-- HARNESS:END -->
