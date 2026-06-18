# US-SPEC1-001 Final Acceptance Gaps

## Outcome

Closed the final explicit SPEC1 behavior gaps:

- Per-habit reminders can be disabled.
- Dashboard widget visibility can be toggled and persists in the browser.

## Validation

- Backend build passed with zero warnings/errors.
- Backend tests passed: 45 Domain and 83 Application.
- Frontend lint passed.
- Frontend tests passed: 31.
- Frontend production build passed.
- `AddHabitReminderPreference` migration applied to PostgreSQL.
- Focused Playwright final SPEC1 preferences and notification ownership passed.
- Full Playwright regression: 23 passed, 9 failed. Most failures are stale
  vocabulary tests that still expect `/` to open Vocabulary instead of the
  Dashboard; remaining failures include one strict selector and two performance
  threshold flakes.
