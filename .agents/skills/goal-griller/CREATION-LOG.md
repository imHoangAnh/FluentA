# Creation Log: goal-griller

## Source Material

Origin:

- User request to prevent careless `/goal` creation by interviewing human intent first
- OpenAI Codex `/goal` framing discussed in-session: durable objective, verifiable stopping condition, and proof before stop
- Matt Pocock `grill-me` skill pattern: relentless interview, one question at a time, recommended answer, explore codebase when discoverable
- Local Khuym skill conventions from `skill-creator` and `writing-khuym-skills`

## Extraction Decisions

What to include:

- A hard gate before final goal drafting
- The six fields required for a safe long-running Codex goal
- One-question-at-a-time interview loop
- Recommended answer attached to every question
- Repo/context inspection instead of asking questions whose answers are locally discoverable
- Explicit "do not silently start" rule so prompt creation does not become accidental execution
- Hook interaction guidance so the general LLM-backed goal guard routes weak goal attempts into this skill

What to leave out:

- Long theory about goal mode
- Scripts, because the workflow is conversational and context-dependent
- Generic prompt-polishing advice already covered by `prompt-leverage`

## RED Phase: Manual Baseline

Forward-testing with subagents was not authorized in this turn, so this baseline is a manual pressure pass based on the user-stated failure mode and prior skill-authoring patterns.

Pressure scenarios:

1. User says: "Set a goal to improve this repo."
   - Likely violation without skill: produce a broad `/goal Improve the repo` prompt.
   - Target correction: ask what truth must exist and how to prove it.

2. User says: "Make the app production ready."
   - Likely violation without skill: invent a large checklist and expand scope.
   - Target correction: force one outcome, scope boundary, and stop rule.

3. User says: "Goal: fix auth."
   - Likely violation without skill: ask the user for facts available in files.
   - Target correction: inspect auth files/tests/docs first, then ask only unresolved questions.

4. User asks for a goal prompt but sounds eager to run it immediately.
   - Likely violation without skill: set the active goal before confirming inferred details.
   - Target correction: draft first; execute only after explicit confirmation.

## GREEN Phase

The skill counters those failure modes by enforcing:

- six-field hard gate
- one-question interview loop
- local discovery before questioning
- anti-vague rewrite examples
- final prompt contract with context, constraints, operating rules, validation, done criteria, and pause rules
- "do not silently start" execution boundary

## Validation Notes

Structural validation completed after creation:

- `quick_validate.py`
- `check-markdown-links.sh`
- `sync-skills.sh --dry-run`

Fresh-thread pressure validation is still recommended before release if this skill is promoted broadly.

## Hook Follow-up

After initial creation, a general `PreToolUse` hook was added at `.codex/hooks/goal_guard.mjs` and wired from `.codex/hooks.json` for `create_goal`, `set_goal`, `set_goals`, and `/goal`-style tool payloads.

The hook intentionally uses `codex exec` as the LLM judge for readiness instead of direct OpenAI API calls, regex, or keyword matching. Regex-like logic is limited to routing/parsing tool payloads, not deciding whether the goal is good. When the LLM rejects a goal, the hook blocks the tool call and tells the session to run `$goal-griller`.
