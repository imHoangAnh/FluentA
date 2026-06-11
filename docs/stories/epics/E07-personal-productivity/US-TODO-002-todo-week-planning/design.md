# Design

## Week Model

- Week starts Monday and ends Sunday.
- Selected day remains the anchor when switching between Day and Week.
- Previous/Next in Week mode shifts the anchor by seven days.
- Week data uses `GET /api/v1/todos?startDate=...&endDate=...`.

## Drag-And-Drop

- Use `@dnd-kit/core` and `@dnd-kit/sortable`.
- Each day is a droppable container.
- Each task is a sortable item with a visible drag handle.
- Within-day drops reorder tasks.
- Cross-day drops update the task date and insert it into the target position.

## Persistence

After a drop, derive the affected day columns and patch every affected task
with only:

```json
{ "date": "YYYY-MM-DD", "sortOrder": 0 }
```

The client updates the week range cache immediately, rolls back on failure, and
invalidates Todo queries after success.

## Desktop Boundary

This story targets desktop pointer interaction. Mobile drag-and-drop is not
implemented.
