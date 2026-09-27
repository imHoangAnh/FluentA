---
name: smart-commits
description: Organize an existing Git tree into logical commits when asked to commit, smart commit, or group changes into commits. Push only when the user authorizes publication. Do not activate merely because implementation is finished; a review or proposed commit grouping alone remains read-only.
---

# Smart Commits

<!-- Source: https://github.com/hoangnb24/skills/tree/9a579fc36d5314de489bfb1c128fe5fb8d7e6146/plugins/khuym/skills/smart-commits ; adapted for contextual Harness use. -->

Turn the authorized part of the working tree into coherent commits. This skill
is for existing work, not a mandatory completion phase or feature-editing
session. If the request only asks for a review or suggested grouping, return a
read-only proposal. Creating commits and publishing them require the respective
user intent; preserve authorization already given in the session.

## Core Rules

- Never edit product code or docs just to make a commit easier. If validation exposes a real blocker, report it and keep the working tree intact unless the user explicitly asks for a fix.
- Never stash, reset, checkout away, overwrite, or revert unrelated changes. In multi-agent repos, treat every existing change as intentional work unless the user explicitly asks otherwise.
- Preserve the user's requested boundary. If they say to leave a path, topic, or change set alone, do not stage it.
- Stage exact files or hunks intentionally. Avoid `git add .` unless the whole tree has been inspected and belongs in one commit group.
- Prefer conventional commit messages with a useful body explaining why the group belongs together.
- Keep commits local unless the user authorizes pushing. A configured remote or
  upstream alone is not authorization. When publishing is authorized, verify the
  destination and branch; if no unambiguous destination exists, report the gap.

## Workflow

1. Inspect the repository:
   ```bash
   git status --porcelain=v1
   git branch --show-current
   git remote -v
   git diff --stat
   git diff --cached --stat
   ```
2. Read enough representative diffs and files to understand intent. Include staged, unstaged, untracked, deleted, and renamed files.
3. Identify commit groups by product intent, not by file type:
   - foundational/configuration changes before dependent feature changes
   - source and directly coupled tests together when they prove one behavior
   - docs as a separate commit only when they are independently meaningful
   - generated artifacts only when they are part of the requested deliverable
4. Run appropriate quality gates before committing when code changed. Use the repo's own checks first. If checks are unavailable, expensive, or already known broken, record that in the final response.
5. Commit one group at a time:
   ```bash
   git add <specific files>
   git commit -m "<type>(<scope>): <subject>" -m "<body>"
   ```
6. After each commit, re-run `git status --porcelain=v1` and continue until all in-scope changes are committed.
7. Only when publishing is authorized, push:
   ```bash
   git push
   ```
   If the branch lacks an upstream, use `git push -u origin <branch>` only when the remote and branch name are clearly correct.

## Grouping Guidance

Good groups:

1. `refactor(auth): extract token validation helper`
2. `feat(users): add email verification endpoint`
3. `test(users): cover email verification flow`

Bad groups:

1. `chore: update files`
2. `docs: update docs and app code`
3. `test: update tests` when the tests prove multiple unrelated features

## Final Response

Report the commits created, push result, validation run, and any remaining out-of-scope or uncommitted files. If the tree is already clean when invoked, verify the latest relevant commit and say no new commit was needed.
