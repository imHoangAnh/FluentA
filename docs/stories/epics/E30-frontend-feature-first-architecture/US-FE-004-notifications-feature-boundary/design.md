# US-FE-004 Design

`app/router.tsx` composes `notificationsRoutes` from the Notifications public
API. The route lazily loads the moved page; the page owns its existing adapter
and keeps all query keys, request methods, rendering states, and accessibility
labels unchanged. The `notifications` legacy manifest entry is deleted in the
same slice.
