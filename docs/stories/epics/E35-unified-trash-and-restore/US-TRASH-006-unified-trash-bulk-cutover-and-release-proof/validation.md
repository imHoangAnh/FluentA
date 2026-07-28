# Validation: US-TRASH-006

## Verified release behavior

`/trash` is authenticated and owner-scoped. It has newest-first list, module
filter, search, time remaining, single Restore/Delete, selected bulk
Restore/Delete, and confirmed Empty Trash for all eight kinds.

| Proof | Result |
| --- | --- |
| Domain tests | 59/59 passed |
| Application tests | 153/153 passed |
| Focused eight-module frontend tests | 50/50 passed |
| Frontend production build | passed; existing SignalR/Rolldown warnings only |
| API build | passed; existing AngleSharp NU1902/Microsoft.OpenApi NU1903 only |
| Diff check | passed; CRLF notices only |

An isolated PostgreSQL 16 proof at port 5433 applied both E35 migrations and
confirmed the live `trash_entries` PK, unique kind/entity, owner/state/time,
and due-purge indexes. Authenticated API smoke proved Todo → Trash → filtered
list → Restore with a 30-day deadline; a second-user smoke proved foreign
permanent delete returns 404, bulk restore returns `succeeded: 2`, and owner
permanent deletion leaves the source Todo inaccessible.

`TrashPurgeJob` claims due entries every five minutes. Legacy cleanup now
retains only Pomodoro cleanup; no E35 type is backfilled from historical
soft-deleted development data.
