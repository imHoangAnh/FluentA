# Design

## Backend

- Add `CountdownEvent` under `FluentA.Domain.BoundedContexts.Countdown`.
- Store `UserId`, `Name`, `TargetDate`, optional `Color`, optional `Icon`, and
  base audit/soft-delete fields.
- Normalize `TargetDate` to UTC before persistence.
- Compute `IsCompleted` from `DateTime.UtcNow >= TargetDate`.
- Add a repository scoped by authenticated user id and excluding soft-deleted
  records.
- Add application validation for required name, ISO target date, optional hex
  color, and short optional icon.
- Add `CountdownsController` under `api/v1/countdowns` using existing
  `ApiEnvelope<T>` and ownership-hidden `404` behavior.

## Frontend

- Add `src/frontend/src/lib/api/countdown.api.ts`.
- Add protected `/countdown` route and workspace nav entry.
- Use a local `datetime-local` input and convert to UTC ISO string for API calls.
- Render sorted cards with optional color stripe/icon, live remaining time via
  client-side interval, completed badge for past targets, edit controls, and
  delete confirmation.

## API Shape

```text
GET    /api/v1/countdowns
POST   /api/v1/countdowns      { name, targetDate, color?, icon? }
PATCH  /api/v1/countdowns/{id} { name?, targetDate?, color?, icon? }
DELETE /api/v1/countdowns/{id}
```

## Data Shape

```text
countdown_events
- id uuid pk
- user_id uuid
- name varchar(180)
- target_date timestamp with time zone
- color varchar(7) null
- icon varchar(16) null
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone null

indexes:
- (user_id, target_date)
```
