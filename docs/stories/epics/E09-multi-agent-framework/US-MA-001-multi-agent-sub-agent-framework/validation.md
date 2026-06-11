# Validation

## Proof Strategy

This story is complete when the repo contains a coherent multi-agent framework
that future Codex sessions can follow without relying on this chat history.
Proof is mostly static and simulation-based because the change is workflow
infrastructure rather than product behavior.

Required proof:

- Repo-local skill files have valid frontmatter and concise role instructions.
- Contract references exist and are linked from the skills that use them.
- The orchestrator routing rules cover tiny, normal, high-risk, review-only,
  QA-only, and research/planning-only requests.
- Planner, Executor, QA, and Reviewer each have clear permissions, skill
  bundles, startup context, and output contracts.
- The framework tells agents how to use plugin skills without copying plugin
  contents into the repo.
- Harness story and trace evidence are updated.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Static parse of every `.agents/skills/*/SKILL.md` frontmatter and required fields. |
| Integration | Verify cross-links among orchestrator, role skills, and contract references. |
| E2E | Simulate routing for tiny, normal, high-risk, review-only, QA-only, and planning-only prompts. |
| Platform | Confirm the framework uses currently available Codex sub-agent types: `default`, `explorer`, and `worker`. |
| Performance | Confirm tiny-task path does not require the full multi-agent flow by default. |
| Logs/Audit | Record Harness trace with multi-agent roles, files changed, validation result, and friction. |

## Fixtures

Simulation prompts:

- Tiny: "Fix a typo in a product doc."
- Normal: "Add a small user-visible setting with frontend and backend support."
- High-risk: "Change auth session behavior and update refresh-token handling."
- Review-only: "Review my current diff and do not edit files."
- QA-only: "Verify the habit tracker flow works in the browser."
- Planning-only: "Explore and plan a new spaced-review dashboard, but do not implement."

## Commands

Commands to run after implementation:

```text
Get-ChildItem .agents\skills -Recurse -Filter SKILL.md
rg -n "^name:|^description:" .agents\skills
rg -n "task envelope|result contract|Planner|Executor|QA|Reviewer" .agents docs AGENTS.md
.\scripts\bin\harness-cli.exe query matrix
.\scripts\bin\harness-cli.exe story verify US-MA-001
```

The final `story verify` command should be configured after the static
validation command exists.

## Acceptance Evidence

Add results after verification.
