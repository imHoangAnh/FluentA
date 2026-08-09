# US-CLEAN-004 Validation

## Planned Proof

- EF model/mapping/config audit and migration SQL scan.
- Exact local/dev connection and zero-data check before reset.
- Baseline apply to empty database, schema inspection, and pending-model check.
- Auth, assets, vocabulary, practice/review, productivity, trash, and Countdown
  recurrence smoke.

## Evidence

- `CountdownEvent.RestoredAtUtc` and its mapping/restore assignment were
  removed. The durable completed-memory behavior remains covered by existing
  visibility tests; the property was write-only and not part of the live query.
- Exact EF target verification reported database `fluenta_dev` on
  `localhost:5432`, user `fluenta`. Before reset it contained only local/dev
  application data; no production target was involved.
- The previous migration source set was replaced with exactly one generated
  baseline pair plus `AppDbContextModelSnapshot.cs`:
  `20260809101816_InitialBaseline`.
- `dotnet ef database drop --force` removed only the verified `fluenta_dev`
  database, then `dotnet ef database update` recreated it from the baseline.
- PostgreSQL inspection after apply: 29 application tables, exactly one
  `__EFMigrationsHistory` row, no `restored_at_utc` column, no
  `legacy_asset_deletion_queue`, and no retired `flashcard_decks`/
  `flashcard_cards` tables.
- `dotnet ef migrations has-pending-model-changes`: passed with no model drift.
- Backend tests after the final model/baseline: Domain 62/62 and Application
  147/147 passed.
