# Design

## Application Flow

Infrastructure registers Hangfire with the existing PostgreSQL connection.
Historically, API startup registered stable recurring-job IDs through typed
inert job contracts. Feature 19 moved runtime registration to
`FluentA.Worker` while preserving IDs and cron expressions.

## Schedules

- Todo carry-over: daily 00:05 UTC.
- Habit reminders: daily 20:00 UTC.
- Countdown alerts: every five minutes.
- Database cleanup: Sunday 02:00 UTC.

## Security

No Hangfire dashboard is exposed.
