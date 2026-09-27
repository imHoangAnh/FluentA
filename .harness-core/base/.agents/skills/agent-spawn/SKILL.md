---
name: agent-spawn
description: Coordinate useful subagent work at discovery, implementation, and validation/review phases of both bounded and durable changes. Use when the repository workflow routes a change here or the user requests delegation. Use the host's configured agents and model defaults; keep read-only requests read-only. Do not use for installation/update alone or turn every small task into a parallel workflow.
---

# Agent Spawn

The main session is the lead. Delegate concrete independent work, integrate the
results, and remain accountable for the requested outcome. This skill explicitly
requests delegation when the eligibility conditions below are met.

## Establish The Phase

Read applicable `AGENTS.md`, `docs/WORKFLOW.md`, and the minimum relevant
contract, code and proof. If these files are absent, follow available project
instructions and report missing authority; do not create policy to fill it.

After this initial inspection, announce the work shape (read-only, bounded
change, or durable planned change), its reason, and the current phase. Reclassify
visibly if scope changes. Read-only work is not automatically routed here;
when delegation is explicitly requested for it, every assignment stays read-only.

Use a session plan for bounded work; create or resume one active plan for
durable work. Delegation alone does not require a new plan, task database, role
lifecycle, or separate status files. A worker follows its assignment; it does
not restart the whole lead workflow or recursively spawn without a delegated
coordination responsibility and an independently useful child task.

## Decide At Each Phase

| Phase | Eligible subagent work | Lead's parallel work |
| --- | --- | --- |
| Discovery | Trace callers, inspect a separate module, locate contracts or existing tests | Investigate another boundary and resolve the requested outcome |
| Implementation | Implement an independent module or file group against an agreed contract | Implement another owned part or integrate already completed work |
| Validation/review | Review a stable change independently or run an isolated check group | Run different checks and assess integrated behavior |

At each phase, identify whether at least one bounded assignment has:

- a specific question or deliverable and enough inputs to start now;
- ownership that avoids conflicting edits or shared mutable test resources;
- useful work for the lead or another worker to do concurrently; and
- an expected benefit that justifies context transfer and integration overhead.

When all conditions hold and delegation tools are available, the lead must
delegate: spawn a suitable subagent or reuse one already suited to the work.
Do not merely recommend parallel work and then do every eligible part yourself.
Do not manufacture tasks, duplicate an investigation, or count tool calls run
in parallel as subagent delegation. A phase does not require a new agent if an
existing worker can take the assignment.

Otherwise state the concrete reason (unresolved dependency, overlapping edits,
tiny indivisible change, no useful concurrent work, unavailable tools, or an
exhausted runtime limit) and proceed sequentially within existing authority.
Reassess in the next phase. Never claim a worker ran when no spawn succeeded.

Discovery may be parallel while product intent is unresolved. Do not delegate
implementation of unresolved policy; return that decision to the user first.

## Use The Host's Existing Defaults

- Use the agent tools and role names actually exposed in this session. Prefer
  `explorer` for code discovery, `worker` for implementation, and `default` for
  other bounded tasks when those roles exist. Review does not require a custom
  `reviewer` role; give a supported role a read-only review assignment.
- Leave spawn `model` and `reasoning_effort` unset unless the user or applicable
  project instructions explicitly select them. Let the host resolve configured
  agent defaults, role settings and inheritance. Do not copy model names,
  reasoning levels, thread limits or machine paths into this skill.
- With a tool exposing `fork_turns`, prefer `"none"` and supply a self-contained
  task packet. Use a partial or full-history fork only when shared history is
  needed. A full-history fork may inherit the lead's model instead of configured
  worker defaults; follow the exposed tool contract and disclose that tradeoff.
- If runtime metadata exposes the selected model, report it accurately. A
  configured default is not evidence of the actual worker model. Do not read
  credentials or dump the full user config just to choose an agent.
- Respect host concurrency and permission limits. Do not change `config.toml`,
  enable features, create custom agents or install tools as a delegation retry.

## Assign And Coordinate

Before delegation, announce the phase, worker responsibility, lead's concurrent
work, and the point where results will be integrated. Keep this brief.

Give each worker a task packet containing:

```text
Outcome / question:
Authority and relevant source paths:
Inputs and dependencies already satisfied:
Ownership: files/modules; read-only or allowed edits:
Expected result and evidence:
Stop and report when:
```

Tell editing workers they share the codebase, must preserve other edits, and
must not revert another worker's changes. Assign one owner for each file being
edited and each runtime, database, fixture set or service lifecycle being
mutated. Narrow assignments when shared boundaries cannot be isolated.

The lead continues its own assigned work. Use available messaging/status/wait
tools to collect results; a wait timeout does not mean the worker failed or
stopped. Send follow-up work to an existing worker when appropriate. On failure
or interruption, inspect partial edits and state before reassigning ownership;
do not start a competing writer while the previous one may still be running.

## Integrate And Report

Read the worker's result and relevant artifacts. Resolve conflicting findings,
inspect the combined diff, and run the checks required for integrated behavior.
Use a different agent for independent review when delegation is eligible;
self-review is not independent evidence. A worker's completion message does not
replace executable or observable proof.

At phase end, report:

- completed outcome and contributing assignments;
- evidence actually observed, including command results or artifact paths;
- failures, unverified claims, unresolved decisions and sequential exceptions;
- next phase and any checkpoint required by the workflow or user.

Checkpoint policy remains with the workflow/user: report when waiting for
validation and do not advance dependent work until the required response arrives.
Do not add approval gates or ask again for continuation already authorized.
Before handing back, account for active workers and disclose any still running.
The lead owns the final result and its limitations.
