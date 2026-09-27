# Repository Workflow

Repository product behavior, architecture, decisions, plans, code, tests, and
runtime signals are the system of record.

## Repository Map

`AGENTS.md` is the entrypoint; `docs/README.md` maps product authority, code,
proof, plans, decisions, and templates.

## Select The Work Shape

### Does The Work Need Durable Memory?

Use an ephemeral plan for bounded work. Create one plan in
`docs/plans/active/` when work spans sessions, needs durable coordination,
has meaningful dependencies, needs recovery, or cannot safely resume from its diff.
Delegation alone does not make a bounded change durable.

Use `docs/templates/exec-plan.md`. Keep progress and task-local decisions in the
same file; avoid parallel task records without an independent audience.

### Does The Work Need Human Judgment?

Before editing, identify authority for new externally observable policy. If
materially different choices remain, stop and request the smallest decision.
Configurable defaults are not authority.

For example, `Add rate limiting` without a quota, trusted key, enforcement
topology, or response contract must stop. `Enforce the documented 20 requests
per minute per authenticated tenant` may proceed.

Also pause for ambiguous product intent, difficult recovery, weakened
validation, security, or compatibility, and insufficient authority.

### What Proves The Behavior?

Use focused tests for local rules, integration tests for boundaries, end-to-end
interaction for user-visible behavior, recovery rehearsal for dangerous
operations, and measurements for reliability or performance.

Plans, checklists, and completion messages do not prove product behavior by
themselves.

### Does The Work Encode An Invariant?

For architecture, reliability, security, or quality boundaries:

1. Find an accepted repository authority that states the required boundary.
   Conventions, code patterns, tests, defaults, and undocumented preferences do
   not establish policy. Stop when authority is absent or materially ambiguous.
2. Reuse the repository's native validation owner and command. Add the smallest
   mechanical check that covers the accepted scope and emits a diagnostic naming
   the violation, rule, and next action.
3. Require positive proof that allowed behavior passes and negative proof that
   the targeted forbidden behavior fails for the intended reason.
4. Report enforcement precisely: a local command is available or passed; a hook
   is optional developer convenience; CI either invokes the check or does not;
   branch protection is externally configured or unverified. Source or CI
   presence alone does not prove merge blocking.

Do not install hooks or change CI, merge, or branch-protection settings unless
separately authorized. Use the [invariant encoding pattern](patterns/encoding-invariants.md)
for the complete method.

## Task Flows

### Change-Phase Delegation

After initial inspection, announce the work shape and reason. For both bounded
and durable changes, use `$agent-spawn` at discovery, implementation, and
validation/review. Delegate eligible independent work using available host
agents and configured defaults; otherwise explain why that phase is sequential.
The lead owns integration and proof. Report each phase's result, evidence,
limits, and next step. Honor user-selected checkpoints before dependent work;
previously authorized continuation remains valid. Keep checkpoint decisions in
the session or existing plan, not in a separate lifecycle.

### Read-Only Request

Read only what the answer, review, diagnosis, plan, or status needs. Use
read-only inspection; do not edit files or Harness state. Discovery never
grants authority to fix what it finds.

### Bounded Change

Inspect authority and affected behavior, make the smallest coherent change,
run focused and required checks, and report evidence and limits.

No parallel lifecycle record is required.

### Durable Planned Change

Create or resume one active plan. Maintain outcome, context, scope, approach,
risk, recovery, progress, decisions, and validation. Implement verifiable groups; promote
lasting decisions. After validation, record results and move the plan to
`docs/plans/completed/`.

### Operate The Application

When a task requires the real application:

1. Find the consumer-owned runbook and verify prerequisites and ownership.
2. Start only an isolated instance, prove readiness, and create known state.
3. Reproduce through the real interface and inspect correlated runtime evidence.
4. Validate through that interface, then stop only resources this run owns.

If no verified runbook exists, report the gap from repository evidence. Do not
invent commands, credentials, policy, or cleanup obligations. The
application-runbook template supplies structure, not operational proof.

### Improve The Harness

Report reusable friction. When the user explicitly invokes `$improve-harness`,
use `docs/templates/harness-improvement.md` to:

1. preserve the observed baseline and human intervention;
2. locate the earliest missing context, capability, owner, authority, proof, or
   environment boundary;
3. make the smallest authorized change at that owner;
4. run native proof and require a materially equivalent fresh-agent rerun; and
5. decide to keep, revise, or remove the intervention.

Do not claim improvement when the rerun did not retrieve or exercise the
intervention. Keep the record active while fresh-rerun evidence is pending.

## Completion Standard

Report the achieved outcome or explicit blocker, current repository truth and
plan, behavior-appropriate proof or its gap, limits, and unattempted work.
Descriptions do not replace observed proof.
