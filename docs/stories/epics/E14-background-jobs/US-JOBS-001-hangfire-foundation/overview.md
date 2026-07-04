# US-JOBS-001: Hangfire Foundation

## Target Behavior

Historical baseline: this story originally hosted a PostgreSQL-backed Hangfire
server in the API and registered the SPEC1 recurring-job schedules at startup
without exposing a public dashboard. Feature 19 / decision 0042 supersedes the
runtime owner: `FluentA.Worker` now hosts the server and registration.

## Non-Goals

- Implementing Todo, Habit, Countdown, or cleanup job behavior.
