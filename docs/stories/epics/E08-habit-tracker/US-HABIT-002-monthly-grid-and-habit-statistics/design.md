# Design

## Frontend Route

- Add `/habits` as a protected route in `App.tsx`.
- Add a Habit navigation link from the workspace and sibling productivity
  pages.
- Use the existing authenticated Axios client and `habit.api.ts` module.

## Data Flow

- Query key: `['habit', 'list', timeZoneId]` for list summaries.
- Per-habit month entries: `['habit', 'entries', habitId, month, timeZoneId]`.
- Mutations invalidate `['habit']` after create, update, delete, and toggle.
- The browser timezone is read from `Intl.DateTimeFormat().resolvedOptions()`
  and sent to all schedule-sensitive calls.

## Monthly Grid

- Rows are habits; columns are days in the selected month.
- The grid is horizontally scrollable on narrow screens.
- Future dates and unscheduled custom days render disabled and cannot be
  toggled.
- Completed dates render with the habit color when available.
- Each interactive cell has an accessible label containing habit name and date.

## Forms

- The page supports create and edit modes with fields for name, description,
  color, icon, frequency, and custom weekdays.
- Daily frequency ignores custom weekdays.
- Custom frequency requires at least one selected weekday before submit.

## Statistics Display

- Use summary fields returned by `GET /api/v1/habits?timeZoneId=...`:
  current streak, scheduled today, checked today, and monthly completion rate.
- Dedicated longest-streak and 7/30-day rate stats remain deferred.
