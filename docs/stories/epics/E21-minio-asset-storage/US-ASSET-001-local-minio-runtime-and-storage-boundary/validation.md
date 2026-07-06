# Validation

## Proof Strategy

Prove that FluentA can host MinIO in local Docker Compose, expose a default
development bucket, and compile a reusable backend storage-provider seam
without yet changing the shipped profile/avatar flow.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Optional adapter/config parsing coverage if new helpers are added. |
| Integration | Docker Compose config remains valid; MinIO service and bucket bootstrap start locally; backend build compiles with the new storage seam. |
| E2E | Not applicable yet. |
| Platform | Windows PowerShell repo-root startup path remains usable. |
| Performance | Not applicable yet beyond a working local runtime. |
| Logs/Audit | Validation records MinIO endpoint/public URL assumptions and any local-only constraints. |

## Fixtures

- Local Docker runtime.
- Existing `fluenta-postgres` and `fluenta-redis` development stack.
- New MinIO development container and default asset bucket.

## Commands

```text
docker compose -f docker-compose.dev.yml config
docker compose -f docker-compose.dev.yml up -d
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
```

## Acceptance Evidence

- `docker compose -f docker-compose.dev.yml config` passed after adding `minio`
  and `minio-bootstrap` services.
- `docker compose -f docker-compose.dev.yml up -d minio minio-bootstrap`
  started MinIO successfully, and `fluenta-minio-bootstrap` exited `0` after
  creating `fluenta-assets-dev` and setting anonymous download access.
- `docker run --rm --network fluenta_default --entrypoint /bin/sh minio/mc:latest -c "mc alias set local http://minio:9000 fluenta_minio_local fluenta_minio_local_secret >/dev/null && mc ls local/fluenta-assets-dev"` passed, confirming the development bucket exists.
- A probe object uploaded through `mc cp` was fetched successfully from
  `http://127.0.0.1:9000/fluenta-assets-dev/probes/runtime.txt`, proving the
  public local URL shape works for later avatar reads.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` is
  still blocked by unrelated dirty-worktree Kanban enum namespace errors, so
  backend compile proof for the new seam remains constrained by external repo
  state rather than this story's runtime changes.
