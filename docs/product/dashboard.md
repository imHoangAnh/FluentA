# Dashboard

Accepted by the user on 2026-10-08. Retain the current Overview UI.

- Five widgets: Review, Todo, Countdown, Habit and Project.
- Review shows the due word count and opens Review.
- Todo shows at most three tasks for today, incomplete tasks first, with direct
  completion toggles and a link to Todo. Keep existing ordering within each group.
- Habit shows at most three habits scheduled today, their streaks and direct
  completion toggles. Keep the API order.
- Countdown shows the nearest Active event, its target date and calendar days
  remaining. Use the same day semantics as Countdown; no hour countdown.
- Project shows total Board/Card counts, up to three Boards and a link to Project.
- Keep drag reordering and widget visibility. Minimum three, maximum five;
  defaults are Review, Todo and Countdown. Persist layout in browser localStorage
  using the existing keys/format; do not add account/device synchronization.
- Each widget loads independently and has its own loading, empty and error UI.
  A failed query offers retry without hiding other widgets.
- Failed Todo/Habit toggles display an error, retain the previous state and
  allow retry. Disable toggles while a save is pending to avoid duplicate clicks.
- Today uses Asia/Ho_Chi_Minh. Refresh date-dependent data on day rollover.
- No new backend endpoint or database migration is needed. Reuse retained feature
  APIs, query keys and their existing deletion/ownership contracts.
