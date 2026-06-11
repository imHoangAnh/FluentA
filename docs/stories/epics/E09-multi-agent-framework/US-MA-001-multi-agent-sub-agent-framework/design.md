# Design

## Domain Model

The framework uses these operating concepts:

- Orchestrator: the main Codex agent in the user thread. It classifies work,
  selects sub-agent roles, passes scoped context, integrates results, and
  records Harness state.
- Role sub-agent: a spawned Codex sub-agent acting under a role contract. The
  first supported roles are Planner, Executor, QA, and Reviewer.
- Skill bundle: a list of repo-local and plugin skills that the orchestrator
  instructs a role sub-agent to use when relevant.
- Task envelope: the structured prompt passed to a sub-agent. It includes lane,
  goal, scope, inputs, allowed files, permission boundary, skills, and expected
  output.
- Result contract: the structured response a sub-agent returns to the
  orchestrator.
- Finding: a reported issue from QA or Reviewer with severity, evidence,
  reproduction or failure scenario, and recommended next action.

## Application Flow

1. The orchestrator reads `AGENTS.md`, Harness docs, and the matrix required by
   the current lane.
2. The orchestrator classifies the request as tiny, normal, or high-risk using
   `docs/FEATURE_INTAKE.md`.
3. The orchestrator decides whether delegation will shorten the critical path.
4. Planner may be spawned for ambiguous, normal, or high-risk work to produce a
   Harness-aware plan or story update.
5. Executor may be spawned as a `worker` for implementation with an explicit
   write scope.
6. QA and Reviewer may be spawned as read-only `default` agents after
   implementation or in parallel with non-overlapping orchestrator work.
7. The orchestrator integrates results, resolves conflicts, asks the human for
   required approvals, records traces, and reports completion only when the
   lane-specific gates pass.

## Interface Contract

Repo-local artifacts should define the following contracts:

- Orchestrator skill: when to delegate, role selection rules, lane mapping,
  critical-path rules, and safety gates.
- Planner skill: Harness planning responsibilities, allowed write scope, and
  plan output format.
- Executor skill: implementation responsibilities, write-scope rules, test
  expectations, and handoff format.
- QA skill: acceptance verification responsibilities, evidence requirements,
  browser/API/database checks, and pass/fail format.
- Reviewer skill: review stance, severity rules, file/line evidence, and
  finding format.
- Contract reference files: task envelope, result contracts, finding schema,
  and skill routing matrix.

Codex sub-agent invocation should use runtime-supported agent types:

- Planner: `default` or `explorer`, depending on whether write access to
  Harness planning artifacts is needed.
- Executor: `worker`.
- QA: `default`.
- Reviewer: `default`.

## Data Model

No application database changes are required. Durable operational records stay
in Harness:

- `harness-cli intake` records the request classification.
- `harness-cli story add/update` tracks story state and proof columns.
- `harness-cli trace` records multi-agent execution, files changed, validation,
  friction, and outcomes.
- `harness-cli backlog add` records framework friction or missing skills.

Optional repo-local runtime files may be introduced only if needed:

- `.agent-workflow/active-agents.json` for current spawned-agent state.
- `.agent-workflow/reservations.json` for file ownership when parallel workers
  are allowed in a later story.

## UI / Platform Impact

There is no product UI impact. The impact is on Codex project workflow and
repo documentation. Browser QA skills may be used by QA sub-agents for
frontend stories, but this story does not add or modify application screens.

## Observability

Every multi-agent run should leave enough evidence for future agents:

- Role assignments and sub-agent results summarized in the Harness trace.
- Validation commands and browser/API evidence recorded in story validation
  sections when a story exists.
- Harness friction captured in the trace and backlog when the framework is
  confusing, missing a skill, or causes redundant work.

## Alternatives Considered

1. Full Agent Workflow with Beads and swarming for every task.
   - Rejected for the first version because it adds overhead for small and
     normal tasks. The repo can still adopt Beads later for large parallel
     execution.
2. One main agent with no delegation.
   - Rejected because the goal is to shorten delivery by delegating planning,
     implementation, QA, and review work when useful.
3. Fixed native agent types named Planner, Executor, QA, and Reviewer.
   - Rejected because the current Codex runtime exposes general sub-agent
     types. Role identity should be defined by task contracts and skill
     bundles.
4. Copying plugin skills into the repo.
   - Rejected because plugin skills should remain external capabilities. The
     repo should define how to select and combine them, not vendor their full
     contents.
