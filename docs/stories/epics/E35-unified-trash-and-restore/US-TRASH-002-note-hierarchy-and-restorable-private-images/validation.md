# Validation: US-TRASH-002

- Board/page Delete creates an owner-scoped `Note` Trash entry; restoring a
  board restores only descendants moved in the same timestamped operation.
- Note image relationships remain attached during Trash. Permanent deletion
  archives ready Note images for the existing retryable asset-purge lifecycle.
- `NoteTrashParticipant` owns hierarchy/media lifecycle. `NoteServiceTests`
  and `TrashRestoreDomainTests` are covered by the full E35 backend runs; the
  focused Notes page test passed in the 50-test frontend run.
- No historical Note rows or detached media are backfilled into Trash.
