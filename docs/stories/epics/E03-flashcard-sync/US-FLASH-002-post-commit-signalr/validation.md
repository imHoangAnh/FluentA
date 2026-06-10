# Validation

## Proof Strategy

Prove authenticated clients receive expected events after successful commits,
anonymous clients are rejected, and failed commands do not publish success.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Notify after repository success; no notify on failure |
| Integration | Authenticated hub connect and payload delivery |
| E2E | Runtime client observes word create/update/delete events |
| Platform | Hub path available from local browser origin |
| Performance | Event received within three seconds of source command |
| Logs/Audit | Tokens and event content are not logged |

## Commands

```text
dotnet test src/backend/FluentA.slnx
runtime SignalR client smoke
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore` passed 21 tests: 8 domain
  and 13 application.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  succeeded with zero warnings.
- Unit coverage proves create/update/delete notifications and proves validation
  and simulated repository commit failures do not publish success events.
- Runtime SignalR client proved anonymous negotiation is rejected with `401`.
- Authenticated runtime client observed 2 `VocabWordSaved` and 6
  `FlashcardDeckUpdated` events across word create/update/delete.
- First event arrived in `307 ms`, below the three-second requirement.
- Runtime payloads contained the expected word, page, board, and two deck IDs.
- Request logs recorded `/hubs/sync` without logging `access_token` or event
  content.
- `npm run lint`, `npm run test:run` (3 tests), and `npm run build` passed after
  adding the SignalR browser client dependency.
- Local Docker PostgreSQL and Redis were restarted and healthy for runtime
  proof.
