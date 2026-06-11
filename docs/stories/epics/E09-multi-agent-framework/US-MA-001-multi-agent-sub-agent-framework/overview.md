# Overview

## Current Behavior

Codex sessions in this repo rely on one main agent to read Harness context,
classify work, plan changes, implement code, run verification, review the diff,
and report completion. Harness already provides intake lanes, context rules,
story packets, validation matrix entries, decisions, traces, and friction
records, but the repo has no first-class sub-agent protocol.

The available Codex runtime supports sub-agents through `spawn_agent` with
general agent types such as `explorer`, `worker`, and `default`. Plugin skills
are available for frontend work, React review, browser verification,
end-to-end flow verification, investigation, Vercel platform workflows, and
document/spreadsheet/presentation tasks. The repo does not yet define how the
main agent should assign those skills to role-based sub-agents.

## Target Behavior

The repo defines a lightweight multi-agent framework where the main Codex agent
acts as the orchestrator and can delegate bounded work to role-based
sub-agents:

- Planner: clarifies scope, classifies Harness lane, and prepares story or
  execution plans.
- Executor: implements scoped frontend, backend, database, and realtime
  changes.
- QA: verifies acceptance criteria, user flows, UI/API behavior, and evidence.
- Reviewer: reviews diffs for correctness, regressions, risks, and missing
  proof.

Each role has an explicit contract, allowed skills, context inputs, permission
boundaries, output format, and escalation rules. The orchestrator remains
responsible for final integration, user communication, Harness traces, and
completion claims.

## Affected Users

- Human project owner steering Codex work in this repository.
- Main Codex agent acting as orchestrator.
- Spawned Codex sub-agents receiving planner, executor, QA, or reviewer tasks.
- Future contributors reading Harness docs to understand agent workflow.

## Affected Product Docs

- `AGENTS.md`
- `docs/HARNESS.md`
- `docs/CONTEXT_RULES.md`
- `docs/HARNESS_COMPONENTS.md`
- `docs/HARNESS_MATURITY.md`
- `docs/TRACE_SPEC.md`
- `.agents/skills/**`

## Non-Goals

- Do not replace Harness intake, story, validation, decision, or trace rules.
- Do not require Beads for the first version of repo-local multi-agent work.
- Do not create fixed Codex-native agent types that the runtime does not
  support.
- Do not copy full plugin skill contents into the repo.
- Do not configure models or reasoning levels for individual sub-agents.
- Do not make QA or Reviewer edit production code.
