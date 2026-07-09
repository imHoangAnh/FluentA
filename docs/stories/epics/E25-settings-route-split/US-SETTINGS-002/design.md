# Design

## Domain Model

- No backend/domain change is required in this story.
- Existing profile, Practice settings, Review settings, and Level 5 data
  contracts remain unchanged.

## Application Flow

- `App.tsx` moves Settings ownership from one route component to a shared
  route shell plus second-level Settings routes.
- The shell provides header/logout affordances and the fixed sidebar.
- Each second-level Settings route renders inside the shell's content area.
- The profile route may initially reuse the current profile-oriented content
  path while shell ownership is introduced.

## Interface Contract

- `/settings` becomes a redirect-only route to `/settings/profile`.
- `/settings/profile`, `/settings/review`, `/settings/practice`, and
  `/settings/level5` are the only supported second-level Settings routes for
  this feature.
- Existing API contracts stay unchanged:
  `GET /api/v1/settings`, `PUT /api/v1/profile`,
  `GET/PUT /api/v1/practice/settings`, `GET/PUT /api/v1/review/settings`,
  and Level 5 review endpoints.

## Data Model

- No migration is required.
- No API DTO change is required in this story.

## UI / Platform Impact

- Settings gains a persistent desktop sidebar navigation.
- Active Settings route state becomes visible in the sidebar.
- Level 5 adopts the shared Settings shell instead of rendering as a standalone
  page with duplicated header/navigation markup.

## Observability

- No new logging or metrics are required.
- Existing protected-route and request/error behavior remains the only runtime
  observability surface.

## Alternatives Considered

1. Keep `/settings` as a real page and add internal tabs or links.
   Rejected because the locked contract requires second-level routes.
2. Keep Level 5 outside the shared shell.
   Rejected because Feature 24 explicitly moves it into the same Settings
   layout/sidebar.
