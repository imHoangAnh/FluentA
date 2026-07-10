# US-NOTE-002 Execution Plan

1. Add a typed frontend Note API client that matches the shipped backend
   `notes` endpoints and envelope shape.
2. Create a dedicated Note route component with board/page query loading,
   creation actions, selection state, and empty/loading/error shells.
3. Register `/notes` in `App.tsx` behind `ProtectedRoute`.
4. Add the `Notes` nav entry to the representative protected pages that define
   the current authenticated navigation experience.
5. Add or update frontend tests to prove:
   authenticated nav exposure, protected route rendering, empty states, board
   creation, page creation, and selected-page placeholder rendering.
6. Run focused frontend tests/build proof and capture any scope repairs before
   implementation approval closeout.
