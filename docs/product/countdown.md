# Countdown Behavior

## User flow

The Countdown page has Active and Complete boards. A countdown stores a name,
target date, and optional cover image. It has no repeat pattern or alert.
On the target date it remains Active. At 00:00 on the following day in Vietnam
time, it moves to Complete and remains visible until deleted.

The Dashboard Countdown widget shows the first countdown returned by the API.
Active countdowns come first; completed countdowns follow, newest target date
first.

## API and ownership

Authenticated endpoints are `GET /api/v1/countdowns`,
`POST /api/v1/countdowns`, and `DELETE /api/v1/countdowns/{countdownId}`.
Creation accepts `name`, `targetDate` in `YYYY-MM-DD` format, and optional
`coverAssetId`. The cover must be a finalized Countdown cover owned by the
user and cannot be attached to another countdown. A user cannot access or
delete another user's countdown.

Delete requires confirmation in the client. The backend sets `deleted_at` and
`updated_at` to the current UTC time. The row remains in PostgreSQL but no
longer appears in the Countdown API or Dashboard. The cover asset record and
the image object in R2 remain unchanged. There is no Trash or restore screen.
A second DELETE for the same Countdown returns `COUNTDOWN_NOT_FOUND`.

The cover remains attached to its hidden Countdown and cannot be reused for a
new Countdown. This policy retains the record and image indefinitely; any
future cleanup or restore flow requires a separate product decision.
