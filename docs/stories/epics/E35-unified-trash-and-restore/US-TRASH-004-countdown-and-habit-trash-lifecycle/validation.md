# Validation: US-TRASH-004

- Countdown Delete clears alerts, retains its cover through Trash, and never
  restores alerts. An old completed Countdown stays visible seven days after
  restore before the retirement job moves it to Trash again.
- Habit Delete/Restore keeps check-ins but leaves reminders disabled.
- `TrashRestoreDomainTests` covers the restored Countdown window and Habit
  reminder non-restoration. Countdown/Habit UI tests passed in the focused
  E35 frontend run. Legacy cleanup no longer directly deletes either kind.
