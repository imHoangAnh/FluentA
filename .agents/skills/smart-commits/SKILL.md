---
name: smart-commits
description: Use when the user asks to commit everything locally, smart commit, group commits, organize staged or unstaged changes, create logical local commits, or preserve a clean commit stack from an existing working tree without pushing.
metadata:
  dependencies:
    git-cli:
      kind: command
      command: git
      missing_effect: unavailable
      reason: The skill inspects repository changes and creates local commits through git.
---

# Smart Commits

Turn the current working tree into one or more coherent local commits. This skill is for committing existing work. It must not become a feature-editing session and must never push.

## Core Rules

- Never edit product code or docs just to make a commit easier. If validation exposes a real blocker, report it and keep the working tree intact unless the user explicitly asks for a fix.
- Never stash, reset, checkout away, overwrite, or revert unrelated changes. In multi-agent repos, treat every existing change as intentional work unless the user explicitly asks otherwise.
- Preserve the user's requested boundary. If they say to leave a path, topic, or change set alone, do not stage it.
- Stage exact files or hunks intentionally. Avoid `git add .` unless the whole tree has been inspected and belongs in one commit group.
- Prefer conventional commit messages with a useful body explaining why the group belongs together.
- Never push, create pull requests, or change remote/upstream configuration. Leave all commits local.

## Workflow

1. Inspect the repository:
   ```bash
   git status --porcelain=v1
   git branch --show-current
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
7. Stop after all in-scope changes are committed. Do not push even when a remote or upstream exists.

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

Report the local commits created, validation run, and any remaining out-of-scope or uncommitted files. State explicitly that no push was performed. If the tree is already clean when invoked, verify the latest relevant commit and say no new commit was needed.
