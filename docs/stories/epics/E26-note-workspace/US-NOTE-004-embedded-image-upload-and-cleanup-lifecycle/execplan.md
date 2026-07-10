# US-NOTE-004 Execution Plan

1. Extend the shared asset model and API helpers with a Note image asset type
   plus bounded frontend upload support.
2. Add or adapt a Note content-processing seam so saved Note HTML can preserve
   safe image tags and reject base64 payloads.
3. Wire paste/drop image upload into the existing Note editor flow and insert
   finalized reload-safe image references into the draft.
4. Reconcile removed durable Note image references on save and mark them for
   cleanup per `D3`.
5. Add focused backend and frontend tests for upload, persistence, sanitization,
   and cleanup behavior.
6. Run targeted proof and capture Harness evidence for `US-NOTE-004`.
