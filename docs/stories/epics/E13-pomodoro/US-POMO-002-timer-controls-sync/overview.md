# US-POMO-002: Pomodoro Timer Controls And Sync

## Summary

Add Redis-backed Pomodoro start, pause, resume, reset, and manual-complete
commands with cross-tab `PomodoroSync`.

## Scope

In scope: server-authoritative timer transitions, Redis writes/deletes,
SignalR broadcast, frontend controls/countdown, and two-tab proof.

Out of scope: automatic completion, long-break scheduling, completed-session
history, daily count, task linking, notifications, and stopwatch.

## Risk Lane

High-risk because this changes public APIs, Redis state semantics, and
cross-tab behavior.
