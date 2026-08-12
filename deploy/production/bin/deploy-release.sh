#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly release_sha="${1:-}"
readonly deploy_dir="${FLUENTA_DEPLOY_DIR:-/opt/fluenta/current}"
readonly env_file="${FLUENTA_ENV_FILE:-/opt/fluenta/shared/production.env}"
readonly backup_script="${FLUENTA_BACKUP_SCRIPT:-/opt/fluenta/bin/backup-postgres.sh}"
readonly state_dir="${FLUENTA_RELEASE_STATE_DIR:-/opt/fluenta/shared/releases}"
readonly lock_file="${FLUENTA_RELEASE_LOCK_FILE:-/run/lock/fluenta-deploy.lock}"
readonly compose_file="${deploy_dir}/compose.yml"
readonly aws_account_id="178868337284"
readonly aws_region="ap-southeast-1"
readonly ecr_registry="${aws_account_id}.dkr.ecr.${aws_region}.amazonaws.com"
readonly api_repository="fluenta-production-api"
readonly migrations_repository="fluenta-production-migrations"
readonly public_ready_url="https://api.sophion.io.vn/health/ready"

references_updated=0
migration_started=0
release_succeeded=0
temporary_env_file=''
previous_references_file=''

fail() {
  printf 'Release failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

restore_pre_migration_references() {
  [[ "$references_updated" -eq 1 ]] || return 0
  [[ "$migration_started" -eq 0 ]] || return 0
  [[ -f "$previous_references_file" ]] || return 0

  local previous_api previous_migrations restore_file
  previous_api="$(sed -n '1p' "$previous_references_file")"
  previous_migrations="$(sed -n '2p' "$previous_references_file")"
  restore_file="$(mktemp "${env_file}.restore.XXXXXX")"
  awk -v api="$previous_api" -v migrations="$previous_migrations" '
    /^API_IMAGE=/ { print api; next }
    /^MIGRATIONS_IMAGE=/ { print migrations; next }
    { print }
  ' "$env_file" >"$restore_file"
  chown --reference="$env_file" "$restore_file"
  chmod --reference="$env_file" "$restore_file"
  mv -- "$restore_file" "$env_file"
  references_updated=0
  printf 'Previous image references restored before migration.\n' >&2
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  [[ -z "$temporary_env_file" || ! -e "$temporary_env_file" ]] || rm -f -- "$temporary_env_file"
  if [[ "$exit_code" -ne 0 ]]; then
    restore_pre_migration_references || true
    if [[ "$migration_started" -eq 1 && "$release_succeeded" -eq 0 ]]; then
      printf '%s\n' \
        'Migration started; automatic image or database rollback is prohibited.' \
        'Keep the off-host backup and use the documented human recovery path.' >&2
    fi
  fi
  exit "$exit_code"
}
trap cleanup EXIT

[[ "$EUID" -eq 0 ]] || fail 'run this release script as root'
[[ "$#" -eq 1 && "$release_sha" =~ ^[0-9a-f]{40}$ ]] ||
  fail 'expected exactly one lowercase 40-character Git commit SHA'

require_command aws
require_command curl
require_command docker
require_command flock
require_command seq
require_command sed
require_command stat

exec 9>"$lock_file"
flock -n 9 || fail 'another production release is already running'

[[ -d "$deploy_dir" ]] || fail "deployment directory is unavailable: $deploy_dir"
[[ -f "$compose_file" ]] || fail "production Compose file is unavailable: $compose_file"
[[ -f "$env_file" ]] || fail "production environment file is unavailable: $env_file"
[[ -x "$backup_script" ]] || fail "backup script is unavailable or not executable: $backup_script"
[[ "$(stat --format='%U:%G' "$env_file")" == 'root:root' ]] ||
  fail 'production environment file must be owned by root:root'
[[ "$(stat --format='%a' "$env_file")" == '600' ]] ||
  fail 'production environment file mode must be 600'
[[ "$(grep -c '^API_IMAGE=' "$env_file")" -eq 1 ]] || fail 'expected exactly one API_IMAGE entry'
[[ "$(grep -c '^MIGRATIONS_IMAGE=' "$env_file")" -eq 1 ]] ||
  fail 'expected exactly one MIGRATIONS_IMAGE entry'

mkdir -p -- "$state_dir"
chown root:root "$state_dir"
chmod 700 "$state_dir"
previous_references_file="${state_dir}/previous-${release_sha}.env"

(
  cd -- "$deploy_dir"
  docker compose --env-file "$env_file" --file "$compose_file" config --quiet
)

curl --fail --silent --show-error --max-time 15 "$public_ready_url" >/dev/null ||
  fail 'current public readiness is not healthy'

api_digest="$(aws ecr describe-images \
  --region "$aws_region" \
  --repository-name "$api_repository" \
  --image-ids imageTag="$release_sha" \
  --query 'imageDetails[0].imageDigest' \
  --output text)"
migrations_digest="$(aws ecr describe-images \
  --region "$aws_region" \
  --repository-name "$migrations_repository" \
  --image-ids imageTag="$release_sha" \
  --query 'imageDetails[0].imageDigest' \
  --output text)"
[[ "$api_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'API ECR digest is invalid'
[[ "$migrations_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'migration ECR digest is invalid'

readonly api_image="${ecr_registry}/${api_repository}@${api_digest}"
readonly migrations_image="${ecr_registry}/${migrations_repository}@${migrations_digest}"

aws ecr get-login-password --region "$aws_region" |
  docker login --username AWS --password-stdin "$ecr_registry" >/dev/null

"$backup_script"
docker pull "$api_image" >/dev/null
docker pull "$migrations_image" >/dev/null

{
  grep '^API_IMAGE=' "$env_file"
  grep '^MIGRATIONS_IMAGE=' "$env_file"
} >"$previous_references_file"
chown root:root "$previous_references_file"
chmod 600 "$previous_references_file"

temporary_env_file="$(mktemp "${env_file}.release.XXXXXX")"
awk -v api="API_IMAGE=${api_image}" -v migrations="MIGRATIONS_IMAGE=${migrations_image}" '
  /^API_IMAGE=/ { print api; next }
  /^MIGRATIONS_IMAGE=/ { print migrations; next }
  { print }
' "$env_file" >"$temporary_env_file"
chown --reference="$env_file" "$temporary_env_file"
chmod --reference="$env_file" "$temporary_env_file"
mv -- "$temporary_env_file" "$env_file"
temporary_env_file=''
references_updated=1

(
  cd -- "$deploy_dir"
  docker compose --env-file "$env_file" --file "$compose_file" config --quiet
)

migration_started=1
(
  cd -- "$deploy_dir"
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    --profile tools \
    run --rm migrations
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    up --detach --no-deps api
)

api_container_id="$(
  cd -- "$deploy_dir"
  docker compose --env-file "$env_file" --file "$compose_file" ps --quiet api
)"
[[ -n "$api_container_id" ]] || fail 'API container was not created'

for attempt in $(seq 1 24); do
  container_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$api_container_id")"
  case "$container_health" in
    healthy)
      break
      ;;
    unhealthy)
      fail 'API container became unhealthy'
      ;;
    *)
      sleep 5
      ;;
  esac
  [[ "$attempt" -lt 24 ]] || fail 'API container health timed out'
done

curl --fail --silent --show-error \
  --retry 12 --retry-delay 5 --retry-all-errors \
  "$public_ready_url" >/dev/null

successful_state_file="${state_dir}/current"
{
  printf 'RELEASE_SHA=%s\n' "$release_sha"
  printf 'API_IMAGE=%s\n' "$api_image"
  printf 'MIGRATIONS_IMAGE=%s\n' "$migrations_image"
  printf 'DEPLOYED_AT_UTC=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} >"${successful_state_file}.tmp"
chown root:root "${successful_state_file}.tmp"
chmod 600 "${successful_state_file}.tmp"
mv -- "${successful_state_file}.tmp" "$successful_state_file"

release_succeeded=1
printf 'FluentA backend release completed: %s\n' "$release_sha"
