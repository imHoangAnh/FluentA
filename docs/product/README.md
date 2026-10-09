# Product Docs

This directory contains current consumer-product behavior derived from real
accepted intent. Harness deliberately ships no fake product domains.

When a user provides a product specification, derive smaller living documents
here instead of keeping one growing specification as the operating manual. Name
files after actual product domains, such as `overview.md`, `billing.md`,
`permissions.md`, or `api-conventions.md`.

## Current Product Contract

Current domain behavior is documented in [Vocabulary](vocabulary.md),
[Practice](practice.md), [Countdown](countdown.md), [Todo](todo.md), and
[Habit](habit.md), and [Project](project.md). Shared deletion behavior is in
[Deletion](deletion.md).
Authentication and explicit Google account linking are in [Auth](auth.md).
The retained account page and removed Settings surface are in [Profile](profile.md).
Image storage setup is
documented in [Cloudflare R2](asset-storage-r2.md). The removed inbox and reminders
are covered by [Notifications removal](notifications.md). The shared editor is
covered by [Journal and Notes](journal-notes.md); removed Pomodoro and realtime
behavior is in [Pomodoro removal](pomodoro-removal.md). Overview behavior is in
[Dashboard](dashboard.md). Other
FluentA product contracts live with their owning feature as they are approved.

## Update Rule

When behavior changes:

1. Update the affected product document when the expected behavior changed.
2. Update the active execution plan when complex work uses one.
3. Add a lasting decision only when future work must inherit a consequential
   product, architecture, data, security, compatibility, or validation choice.
4. Add or update executable proof that exercises the behavior.

Bounded changes do not require a parallel lifecycle record.
