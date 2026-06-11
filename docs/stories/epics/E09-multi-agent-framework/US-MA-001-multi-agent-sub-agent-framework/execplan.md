# Exec Plan

## Goal

Create a Harness-compatible multi-agent framework that lets the main Codex
agent delegate work to Planner, Executor, QA, and Reviewer sub-agents with
role-specific skills, permissions, context inputs, and result contracts.

## Scope

In scope:

- Create repo-local skills under `.agents/skills/` for orchestrator, planner,
  executor, QA, and reviewer behavior.
- Create contract references for task envelopes, role result formats, finding
  severity, and plugin skill routing.
- Update Harness docs so future agents know when and how to use delegation.
- Define default skill bundles for each role using available Agent Workflow and
  plugin skills.
- Add simulation validation prompts for tiny, normal, high-risk, review-only,
  QA-only, and implementation tasks.
- Record Harness durable story and trace evidence.

Out of scope:

- Model or reasoning configuration per sub-agent.
- Parallel implementation by multiple Executors in this story.
- Beads-based worker graph orchestration.
- New application features.
- Production deployment automation.
- Copying third-party plugin skill bodies into the repo.

## Risk Classification

Risk flags:

- Existing behavior: changes the expected agent workflow for the whole repo.
- Public contracts: changes instructions future agents rely on.
- Weak proof: multi-agent behavior is mostly protocol and simulation evidence.
- Multi-domain: touches Harness docs, skills, and operational trace behavior.

Hard gates:

- Changing the feature workflow.

Lane: high-risk.

## Work Phases

1. Discovery.
   - Confirm current Harness rules, context phases, story templates, and
     available Codex sub-agent types.
   - Inventory plugin skills that are relevant to Planner, Executor, QA, and
     Reviewer roles.
2. Design.
   - Define role boundaries, allowed write scopes, skill bundles, task
     envelope fields, result contracts, and escalation rules.
   - Decide how tiny, normal, and high-risk lanes use delegation.
3. Validation planning.
   - Define static checks for skill frontmatter and contract links.
   - Define simulation checks for routing and role outputs.
4. Implementation.
   - Add `.agents/skills/harness-orchestrator/`.
   - Add `.agents/skills/harness-planner/`.
   - Add `.agents/skills/harness-executor/`.
   - Add `.agents/skills/harness-qa/`.
   - Add `.agents/skills/harness-reviewer/`.
   - Add contract reference files.
   - Update docs and `AGENTS.md` with minimal entrypoint instructions.
5. Verification.
   - Run static file checks.
   - Run Harness CLI matrix/story checks.
   - Simulate role routing for representative task prompts.
6. Harness update.
   - Update story evidence, durable proof status, trace, and backlog items if
     friction remains.

## Stop Conditions

Pause for human confirmation if:

- The role model changes away from Planner, Executor, QA, and Reviewer.
- A new role is required before the first implementation.
- Parallel code-writing Executors become necessary.
- A sub-agent needs permission to edit outside its assigned scope.
- Validation requirements need to be weakened.
- The workflow would require changing Harness lane definitions.
