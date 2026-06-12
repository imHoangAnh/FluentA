# US-JOBS-001: Hangfire Foundation

## Target Behavior

The API hosts a PostgreSQL-backed Hangfire server and registers the SPEC1
recurring-job schedules at startup without exposing a public dashboard.

## Non-Goals

- Implementing Todo, Habit, Countdown, or cleanup job behavior.
