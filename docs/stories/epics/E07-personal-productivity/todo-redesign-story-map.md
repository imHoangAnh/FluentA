# E07 Todo Redesign Story Map

## Delivery Shape

| Story | Lane | Outcome | Dependencies | Observable exit state |
| --- | --- | --- | --- | --- |
| `US-TODO-003` | high-risk | My Day core workspace | Approved D1-D58 context | Today-only quick add opens a side-by-side detail panel; title/note/importance persist; context actions, confirmed delete, local sort, manual reorder, and collapsed Completed behavior are proven |
| `US-TODO-004` | high-risk | Repeat occurrence lifecycle | `US-TODO-003` | The exact five repeat choices work from the panel; completion creates exactly one next occurrence; reopen/delete behavior and warnings match D10-D11/D29/D45-D47 |
| `US-TODO-005` | high-risk | Reminder delivery and notification navigation | `US-TODO-004` | One timezone-fixed reminder is scheduled, cancelled/cleared/copied correctly, delivered once by the API-hosted scanner, and opens the owned task detail from Notifications |
| `US-TODO-006` | high-risk | Week v2, duplicate, and release proof | `US-TODO-005` | The approved seven-column Week UI, per-day add, shared details, icon-only star, duplicate, navigation, reorder/move accessibility, 4:1 desktop layout, contracts, and release proof are complete |

## Dependency Cause And Effect

1. My Day establishes the shared compact row and detail-panel ownership once.
2. Repeat adds atomic generated-occurrence behavior to that panel and Todo
   mutation seam.
3. Reminder then extends both normal and generated occurrences and connects the
   existing job/Notification domains.
4. Week consumes the finished shared task contract, so Duplicate can copy every
   approved field server-side and the final visual proof exercises the real
   behavior rather than placeholders.

## Validation Gates

- Validate and implement only one story at a time.
- A story cannot advance because its dependency merely builds; the dependency's
  acceptance evidence and Harness proof flags must be complete.
- Any required breaking API replacement, second recurrence table, per-task job,
  or external notification URL stops the story and returns to human approval.
- `US-TODO-006` is the release boundary. Until it passes, the initiative is not
  described as fully delivered even when earlier My Day features are usable.
