# Validation: US-TRASH-005

- Journal retains date/content and restores to its original context.
- Kanban board/column/card use one `Kanban` Trash kind; restore retains stored
  sort order. Permanent board/column deletion removes cards before parents to
  satisfy restrict foreign keys.
- Journal/Kanban application tests, Kanban frontend tests, and the full E35
  backend/frontend regression runs pass. Regular Kanban Delete is immediate
  with Undo; only `/trash` permanent delete is confirmed.
