# US-NOTE-004 Design

## Repo Reality

- `NotesPage.tsx` already owns the active Note draft and current save flow, so
  image insertion should extend that route-level editor state instead of
  inventing a second Note editor host.
- `assets.api.ts` currently exposes shared presign/finalize/list/delete helpers
  but only wraps `avatar` and `countdown-cover` uploads.
- `AssetService` currently validates only `avatar` and `countdown-cover` asset
  types and enforces the shared image limits there.
- `NoteService` currently persists raw `content` strings and does not sanitize
  HTML or reconcile embedded asset references.
- `JournalContentProcessor` sanitizes a text-focused HTML subset and does not
  currently allow `<img>` tags or Note-specific asset validation.

## Planned Shape

- Extend the shared asset bounded context with a Note image asset type and
  shared validation rules consistent with the existing image policy.
- Add frontend upload helpers for Note image files on top of the shared asset
  API instead of a Note-only binary transport.
- Introduce a Note content-processing path that:
  preserves safe image tags,
  rejects or strips base64 image payloads,
  and can extract durable Note-owned image references from saved content.
- Reconcile previously persisted image references against the next saved Note
  content so removed Note images can be marked for cleanup per `D3`.

## Cleanup Boundary

- The story should not physically delete an image the moment it disappears from
  the editor DOM.
- Save-time reconciliation should identify Note-owned images removed from the
  durable content and mark them for cleanup through the shared asset lifecycle.
- The cleanup shape must remain safe if future Note work allows the same asset
  to stay referenced in current saved content.

## Risk Controls

- Keep Note image upload inside the shared asset contract so ownership,
  finalize verification, and storage-unavailable handling remain centralized.
- Do not expand the sanitizer boundary casually; safe image tags and
  attributes must be explicit and bounded.
- Do not trust arbitrary remote image URLs pasted into HTML as Note-owned
  assets; only shared asset references created through the Note upload flow
  should participate in cleanup.
- Preserve the current Note draft on upload or save failure.

## Likely Test Surface

- Backend asset and Note tests for:
  allowed Note image type handling,
  base64 rejection,
  reference extraction,
  and removed-image cleanup marking.
- Frontend Note route tests for:
  pasted image upload success,
  dropped image upload failure,
  and persisted-content save behavior.
