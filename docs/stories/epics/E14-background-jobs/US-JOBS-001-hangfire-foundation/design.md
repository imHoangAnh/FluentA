# Design

## Application Flow

Infrastructure registers Hangfire with the existing PostgreSQL connection. API
startup registers stable recurring-job IDs through typed inert job contracts.

## Schedules

- Todo carry-over: daily 00:05 UTC.
- Habit reminders: daily 20:00 UTC.
- Countdown alerts: every five minutes.
- Database cleanup: Sunday 02:00 UTC.

## Security

No Hangfire dashboard is exposed.
