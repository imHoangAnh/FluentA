# Design — US-FE-009

The app router composes `todoRoutes` from `@/features/todo`. The feature owns
the Todo route/UI/API/realtime hook and exports only the small public Todo API
contract required by Dashboard. Existing day/week query keys and SignalR
invalidation remain unchanged.
