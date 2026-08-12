#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly release_sha="${1:-}"
readonly deploy_dir="${FLUENTA_DEPLOY_DIR:-/opt/fluenta/current}"
readonly env_file="${FLUENTA_ENV_FILE:-/opt/fluenta/shared/production.env}"
readonly backup_script="${FLUENTA_BACKUP_SCRIPT:-/opt/fluenta/bin/backup-postgres.sh}"
readonly release_script_path="${FLUENTA_RELEASE_SCRIPT_PATH:-/opt/fluenta/bin/deploy-release.sh}"
readonly state_dir="${FLUENTA_RELEASE_STATE_DIR:-/opt/fluenta/shared/releases}"
readonly config_backup_root="${FLUENTA_CONFIG_BACKUP_ROOT:-/opt/fluenta/shared/deployment-backups}"
readonly config_rollback_marker="${FLUENTA_CONFIG_ROLLBACK_MARKER:-${state_dir}/pending-config-rollback}"
readonly lock_file="${FLUENTA_RELEASE_LOCK_FILE:-/run/lock/fluenta-deploy.lock}"
readonly compose_file="${deploy_dir}/compose.yml"
readonly caddy_file="${deploy_dir}/Caddyfile"
readonly aws_account_id="178868337284"
readonly aws_region="ap-southeast-1"
readonly ecr_registry="${aws_account_id}.dkr.ecr.${aws_region}.amazonaws.com"
readonly api_repository="fluenta-production-api"
readonly migrations_repository="fluenta-production-migrations"
readonly frontend_repository="fluenta-production-web"
readonly public_api_ready_url="https://api.sophion.io.vn/health/ready"
readonly public_frontend_url="https://sophion.io.vn/"
readonly public_frontend_deep_link="https://sophion.io.vn/settings/practice"

references_updated=0
migration_started=0
release_succeeded=0
frontend_rollback_completed=0
temporary_env_file=''
previous_references_file=''

fail() {
  printf 'Release failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

replace_image_references() {
  local api_reference="$1"
  local migrations_reference="$2"
  local frontend_reference="$3"
  local replacement_file
  replacement_file="$(mktemp "${env_file}.replace.XXXXXX")"

  awk \
    -v api="$api_reference" \
    -v migrations="$migrations_reference" \
    -v frontend="$frontend_reference" '
      /^API_IMAGE=/ { print api; next }
      /^MIGRATIONS_IMAGE=/ { print migrations; next }
      /^FRONTEND_IMAGE=/ { print frontend; next }
      { print }
    ' "$env_file" >"$replacement_file"
  chown --reference="$env_file" "$replacement_file"
  chmod --reference="$env_file" "$replacement_file"
  mv -- "$replacement_file" "$env_file"
}

restore_pre_migration_references() {
  [[ "$references_updated" -eq 1 ]] || return 0
  [[ "$migration_started" -eq 0 ]] || return 0
  [[ -f "$previous_references_file" ]] || return 0

  local previous_api previous_migrations previous_frontend
  previous_api="$(sed -n '1p' "$previous_references_file")"
  previous_migrations="$(sed -n '2p' "$previous_references_file")"
  previous_frontend="$(sed -n '3p' "$previous_references_file")"
  replace_image_references "$previous_api" "$previous_migrations" "$previous_frontend"
  references_updated=0
  printf 'Previous image references restored before migration.\n' >&2
}

restore_previous_frontend_reference() {
  [[ -f "$previous_references_file" ]] || fail 'previous image references are unavailable'
  local current_api current_migrations previous_frontend
  current_api="$(grep '^API_IMAGE=' "$env_file")"
  current_migrations="$(grep '^MIGRATIONS_IMAGE=' "$env_file")"
  previous_frontend="$(sed -n '3p' "$previous_references_file")"
  [[ "$previous_frontend" == FRONTEND_IMAGE=* ]] || fail 'previous frontend reference is invalid'
  replace_image_references "$current_api" "$current_migrations" "$previous_frontend"
}

restore_pending_deployment_artifacts() {
  [[ -f "$config_rollback_marker" ]] || return 0

  local backup_dir resolved_backup_root resolved_backup_dir
  backup_dir="$(sed -n '1p' "$config_rollback_marker")"
  resolved_backup_root="$(readlink -f -- "$config_backup_root")"
  resolved_backup_dir="$(readlink -f -- "$backup_dir")"
  case "$resolved_backup_dir" in
    "${resolved_backup_root}"/*) ;;
    *) fail 'deployment artifact rollback marker points outside the backup root' ;;
  esac

  [[ -f "${resolved_backup_dir}/compose.yml" ]] || fail 'previous Compose artifact is unavailable'
  [[ -f "${resolved_backup_dir}/Caddyfile" ]] || fail 'previous Caddy artifact is unavailable'
  [[ -f "${resolved_backup_dir}/deploy-release.sh" ]] || fail 'previous release script artifact is unavailable'

  install -o root -g root -m 644 "${resolved_backup_dir}/compose.yml" "$compose_file"
  install -o root -g root -m 644 "${resolved_backup_dir}/Caddyfile" "$caddy_file"
  install -o root -g root -m 755 "${resolved_backup_dir}/deploy-release.sh" "$release_script_path"
  rm -f -- "$config_rollback_marker"
  printf 'Previous Compose, Caddy, and release-script artifacts restored.\n' >&2
}

compose() {
  (
    cd -- "$deploy_dir"
    docker compose --env-file "$env_file" --file "$compose_file" "$@"
  )
}

service_container_id() {
  compose ps --quiet "$1"
}

wait_for_container_health() {
  local container_id="$1"
  local label="$2"
  local container_health
  [[ -n "$container_id" ]] || return 1

  for _ in $(seq 1 24); do
    container_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id")"
    case "$container_health" in
      healthy)
        return 0
        ;;
      unhealthy|missing)
        printf '%s container health is %s.\n' "$label" "$container_health" >&2
        return 1
        ;;
      *)
        sleep 5
        ;;
    esac
  done
  printf '%s container health timed out.\n' "$label" >&2
  return 1
}

rollback_frontend_edge() {
  restore_previous_frontend_reference
  restore_pending_deployment_artifacts
  compose config --quiet
  compose up --detach --no-deps caddy

  local caddy_container_id
  caddy_container_id="$(service_container_id caddy)"
  wait_for_container_health "$caddy_container_id" 'Caddy rollback' ||
    fail 'frontend rollback could not restore a healthy Caddy container'
  curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
    "$public_api_ready_url" >/dev/null ||
    fail 'frontend rollback completed but public API readiness did not recover'

  frontend_rollback_completed=1
  printf 'Previous frontend edge release restored; API and database references were retained.\n' >&2
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  [[ -z "$temporary_env_file" || ! -e "$temporary_env_file" ]] || rm -f -- "$temporary_env_file"
  if [[ "$exit_code" -ne 0 ]]; then
    restore_pre_migration_references || true
    if [[ "$migration_started" -eq 1 && "$release_succeeded" -eq 0 ]]; then
      printf '%s\n' \
        'Migration started; automatic API image or database rollback is prohibited.' \
        'Keep the off-host backup and use the documented human recovery path.' >&2
      if [[ "$frontend_rollback_completed" -eq 1 ]]; then
        printf 'The frontend edge was rolled back independently.\n' >&2
      fi
    fi
  fi
  exit "$exit_code"
}
trap cleanup EXIT

[[ "$EUID" -eq 0 ]] || fail 'run this release script as root'
[[ "$#" -eq 1 && "$release_sha" =~ ^[0-9a-f]{40}$ ]] ||
  fail 'expected exactly one lowercase 40-character Git commit SHA'

for command_name in aws awk curl docker flock grep install mktemp readlink sed seq stat; do
  require_command "$command_name"
done

exec 9>"$lock_file"
flock -n 9 || fail 'another production release is already running'

[[ -d "$deploy_dir" ]] || fail "deployment directory is unavailable: $deploy_dir"
[[ -f "$compose_file" ]] || fail "production Compose file is unavailable: $compose_file"
[[ -f "$caddy_file" ]] || fail "production Caddyfile is unavailable: $caddy_file"
[[ -f "$env_file" ]] || fail "production environment file is unavailable: $env_file"
[[ -x "$backup_script" ]] || fail "backup script is unavailable or not executable: $backup_script"
[[ "$(stat --format='%U:%G' "$env_file")" == 'root:root' ]] ||
  fail 'production environment file must be owned by root:root'
[[ "$(stat --format='%a' "$env_file")" == '600' ]] ||
  fail 'production environment file mode must be 600'
[[ "$(grep -c '^API_IMAGE=' "$env_file")" -eq 1 ]] || fail 'expected exactly one API_IMAGE entry'
[[ "$(grep -c '^MIGRATIONS_IMAGE=' "$env_file")" -eq 1 ]] ||
  fail 'expected exactly one MIGRATIONS_IMAGE entry'
[[ "$(grep -c '^FRONTEND_IMAGE=' "$env_file")" -eq 1 ]] ||
  fail 'expected exactly one FRONTEND_IMAGE entry'
[[ "$(grep -c '^CADDY_ACME_EMAIL=' "$env_file")" -eq 1 ]] ||
  fail 'expected exactly one CADDY_ACME_EMAIL entry'

mkdir -p -- "$state_dir"
chown root:root "$state_dir"
chmod 700 "$state_dir"
previous_references_file="${state_dir}/previous-${release_sha}.env"

compose config --quiet
curl --fail --silent --show-error --max-time 15 "$public_api_ready_url" >/dev/null ||
  fail 'current public API readiness is not healthy'

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
frontend_digest="$(aws ecr describe-images \
  --region "$aws_region" \
  --repository-name "$frontend_repository" \
  --image-ids imageTag="$release_sha" \
  --query 'imageDetails[0].imageDigest' \
  --output text)"
[[ "$api_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'API ECR digest is invalid'
[[ "$migrations_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'migration ECR digest is invalid'
[[ "$frontend_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'frontend ECR digest is invalid'

readonly api_image="${ecr_registry}/${api_repository}@${api_digest}"
readonly migrations_image="${ecr_registry}/${migrations_repository}@${migrations_digest}"
readonly frontend_image="${ecr_registry}/${frontend_repository}@${frontend_digest}"

aws ecr get-login-password --region "$aws_region" |
  docker login --username AWS --password-stdin "$ecr_registry" >/dev/null

docker pull "$api_image" >/dev/null
docker pull "$migrations_image" >/dev/null
docker pull "$frontend_image" >/dev/null

caddy_email="$(sed -n 's/^CADDY_ACME_EMAIL=//p' "$env_file")"
[[ -n "$caddy_email" ]] || fail 'CADDY_ACME_EMAIL must not be empty'
docker run --rm \
  --read-only \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --env "CADDY_ACME_EMAIL=${caddy_email}" \
  --volume "${caddy_file}:/etc/caddy/Caddyfile:ro" \
  "$frontend_image" \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null ||
  fail 'candidate frontend image rejected the production Caddy configuration'

"$backup_script"

{
  grep '^API_IMAGE=' "$env_file"
  grep '^MIGRATIONS_IMAGE=' "$env_file"
  grep '^FRONTEND_IMAGE=' "$env_file"
} >"$previous_references_file"
chown root:root "$previous_references_file"
chmod 600 "$previous_references_file"

temporary_env_file="$(mktemp "${env_file}.release.XXXXXX")"
awk \
  -v api="API_IMAGE=${api_image}" \
  -v migrations="MIGRATIONS_IMAGE=${migrations_image}" \
  -v frontend="FRONTEND_IMAGE=${frontend_image}" '
    /^API_IMAGE=/ { print api; next }
    /^MIGRATIONS_IMAGE=/ { print migrations; next }
    /^FRONTEND_IMAGE=/ { print frontend; next }
    { print }
  ' "$env_file" >"$temporary_env_file"
chown --reference="$env_file" "$temporary_env_file"
chmod --reference="$env_file" "$temporary_env_file"
mv -- "$temporary_env_file" "$env_file"
temporary_env_file=''
references_updated=1

compose config --quiet

migration_started=1
compose --profile tools run --rm migrations
compose up --detach --no-deps api

api_container_id="$(service_container_id api)"
wait_for_container_health "$api_container_id" 'API' || fail 'API container did not become healthy'

compose up --detach --no-deps caddy
caddy_container_id="$(service_container_id caddy)"
if ! wait_for_container_health "$caddy_container_id" 'Caddy candidate'; then
  rollback_frontend_edge
  fail 'candidate Caddy container was unhealthy; previous frontend edge restored'
fi

curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
  "$public_api_ready_url" >/dev/null ||
  fail 'public API readiness failed after the edge update'

if ! curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
  "$public_frontend_url" >/dev/null ||
  ! curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
  "$public_frontend_deep_link" >/dev/null; then
  rollback_frontend_edge
  fail 'frontend readiness failed; previous frontend edge restored'
fi

successful_state_file="${state_dir}/current"
{
  printf 'RELEASE_SHA=%s\n' "$release_sha"
  printf 'API_IMAGE=%s\n' "$api_image"
  printf 'MIGRATIONS_IMAGE=%s\n' "$migrations_image"
  printf 'FRONTEND_IMAGE=%s\n' "$frontend_image"
  printf 'DEPLOYED_AT_UTC=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} >"${successful_state_file}.tmp"
chown root:root "${successful_state_file}.tmp"
chmod 600 "${successful_state_file}.tmp"
mv -- "${successful_state_file}.tmp" "$successful_state_file"

rm -f -- "$config_rollback_marker"
release_succeeded=1
printf 'FluentA production release completed: %s\n' "$release_sha"
