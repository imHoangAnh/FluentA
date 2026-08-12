#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly staged_dir_input="${1:-}"
readonly expected_manifest_sha="${2:-}"
readonly deploy_dir="${FLUENTA_DEPLOY_DIR:-/opt/fluenta/current}"
readonly env_file="${FLUENTA_ENV_FILE:-/opt/fluenta/shared/production.env}"
readonly release_script_path="${FLUENTA_RELEASE_SCRIPT_PATH:-/opt/fluenta/bin/deploy-release.sh}"
readonly backup_root="${FLUENTA_CONFIG_BACKUP_ROOT:-/opt/fluenta/shared/deployment-backups}"
readonly rollback_marker="${FLUENTA_CONFIG_ROLLBACK_MARKER:-/opt/fluenta/shared/releases/pending-config-rollback}"
readonly lock_file="${FLUENTA_RELEASE_LOCK_FILE:-/run/lock/fluenta-deploy.lock}"

installation_started=0
installation_succeeded=0
backup_dir=''

fail() {
  printf 'Artifact installation failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

restore_on_failure() {
  [[ "$installation_started" -eq 1 ]] || return 0
  [[ "$installation_succeeded" -eq 0 ]] || return 0
  [[ -d "$backup_dir" ]] || return 0

  install -o root -g root -m 644 "${backup_dir}/compose.yml" "${deploy_dir}/compose.yml"
  install -o root -g root -m 644 "${backup_dir}/Caddyfile" "${deploy_dir}/Caddyfile"
  install -o root -g root -m 755 "${backup_dir}/deploy-release.sh" "$release_script_path"
  rm -f -- "$rollback_marker"
  printf 'Previous deployment artifacts restored after installation failure.\n' >&2
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  if [[ "$exit_code" -ne 0 ]]; then
    restore_on_failure || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT

[[ "$EUID" -eq 0 ]] || fail 'run this installer as root'
[[ "$#" -eq 2 && -n "$staged_dir_input" && "$expected_manifest_sha" =~ ^[0-9a-f]{64}$ ]] ||
  fail 'expected a staged artifact directory and lowercase SHA-256 of SHA256SUMS'

for command_name in \
  chmod chown dirname docker flock grep install mkdir mktemp mv readlink sed sha256sum stat wc; do
  require_command "$command_name"
done

exec 9>"$lock_file"
flock -n 9 || fail 'another production release or artifact installation is already running'

staged_dir="$(readlink -f -- "$staged_dir_input")"
[[ -d "$staged_dir" ]] || fail 'staged artifact directory is unavailable'
[[ -f "${staged_dir}/SHA256SUMS" ]] || fail 'SHA256SUMS is missing from the staged artifact directory'
[[ -f "${staged_dir}/compose.yml" ]] || fail 'staged compose.yml is missing'
[[ -f "${staged_dir}/Caddyfile" ]] || fail 'staged Caddyfile is missing'
[[ -f "${staged_dir}/bin/deploy-release.sh" ]] || fail 'staged deploy-release.sh is missing'
[[ -f "${staged_dir}/bin/install-deployment-artifacts.sh" ]] ||
  fail 'staged install-deployment-artifacts.sh is missing'

for staged_path in \
  "$staged_dir" \
  "${staged_dir}/bin" \
  "${staged_dir}/SHA256SUMS" \
  "${staged_dir}/compose.yml" \
  "${staged_dir}/Caddyfile" \
  "${staged_dir}/bin/deploy-release.sh" \
  "${staged_dir}/bin/install-deployment-artifacts.sh"; do
  [[ "$(stat --format='%U:%G' "$staged_path")" == 'root:root' ]] ||
    fail "staged path must be owned by root:root: $staged_path"
  staged_mode="$(stat --format='%a' "$staged_path")"
  (( (8#${staged_mode} & 8#022) == 0 )) ||
    fail "staged path must not be group- or world-writable: $staged_path"
done

actual_manifest_sha="$(sha256sum "${staged_dir}/SHA256SUMS")"
actual_manifest_sha="${actual_manifest_sha%% *}"
[[ "$actual_manifest_sha" == "$expected_manifest_sha" ]] ||
  fail 'SHA256SUMS does not match the operator-approved manifest digest'

manifest_count="$(grep -Ec '^[0-9a-f]{64}  (Caddyfile|compose.yml|bin/deploy-release\.sh|bin/install-deployment-artifacts\.sh)$' "${staged_dir}/SHA256SUMS")"
[[ "$manifest_count" -eq 4 ]] || fail 'SHA256SUMS must contain exactly the four approved deployment artifacts'
[[ "$(wc -l <"${staged_dir}/SHA256SUMS")" -eq 4 ]] ||
  fail 'SHA256SUMS contains an unapproved entry'
for artifact_path in \
  Caddyfile compose.yml bin/deploy-release.sh bin/install-deployment-artifacts.sh; do
  [[ "$(grep -Ec "^[0-9a-f]{64}  ${artifact_path//./\\.}$" "${staged_dir}/SHA256SUMS")" -eq 1 ]] ||
    fail "SHA256SUMS must contain exactly one ${artifact_path} entry"
done
(
  cd -- "$staged_dir"
  sha256sum --check --strict --status SHA256SUMS
) || fail 'staged deployment artifact checksum verification failed'

[[ -d "$deploy_dir" ]] || fail 'production deployment directory is unavailable'
[[ -f "${deploy_dir}/compose.yml" ]] || fail 'current production compose.yml is unavailable'
[[ -f "${deploy_dir}/Caddyfile" ]] || fail 'current production Caddyfile is unavailable'
[[ -f "$release_script_path" ]] || fail 'current production release script is unavailable'
[[ -f "$env_file" ]] || fail 'production environment file is unavailable'
[[ "$(stat --format='%U:%G' "$env_file")" == 'root:root' ]] ||
  fail 'production environment file must be owned by root:root'
[[ "$(stat --format='%a' "$env_file")" == '600' ]] ||
  fail 'production environment file mode must be 600'
[[ "$(grep -c '^FRONTEND_IMAGE=' "$env_file")" -eq 1 ]] ||
  fail 'production environment must contain exactly one FRONTEND_IMAGE entry before installation'
[[ "$(grep -c '^CADDY_ACME_EMAIL=' "$env_file")" -eq 1 ]] ||
  fail 'production environment must contain exactly one CADDY_ACME_EMAIL entry'

docker compose \
  --env-file "$env_file" \
  --file "${staged_dir}/compose.yml" \
  config --quiet

frontend_image="$(sed -n 's/^FRONTEND_IMAGE=//p' "$env_file")"
caddy_email="$(sed -n 's/^CADDY_ACME_EMAIL=//p' "$env_file")"
[[ "$frontend_image" == *@sha256:* ]] || fail 'current FRONTEND_IMAGE is not an immutable digest reference'
[[ -n "$caddy_email" ]] || fail 'CADDY_ACME_EMAIL must not be empty'
docker run --rm \
  --read-only \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --env "CADDY_ACME_EMAIL=${caddy_email}" \
  --volume "${staged_dir}/Caddyfile:/etc/caddy/Caddyfile:ro" \
  "$frontend_image" \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null ||
  fail 'staged Caddyfile failed validation with the current edge image'

mkdir -p -- "$backup_root" "$(dirname -- "$rollback_marker")"
chown root:root "$backup_root" "$(dirname -- "$rollback_marker")"
chmod 700 "$backup_root" "$(dirname -- "$rollback_marker")"
backup_dir="$(mktemp -d "${backup_root}/deployment-XXXXXXXXXXXXXX")"
chown root:root "$backup_dir"
chmod 700 "$backup_dir"

install -o root -g root -m 644 "${deploy_dir}/compose.yml" "${backup_dir}/compose.yml"
install -o root -g root -m 644 "${deploy_dir}/Caddyfile" "${backup_dir}/Caddyfile"
install -o root -g root -m 755 "$release_script_path" "${backup_dir}/deploy-release.sh"

installation_started=1
install -o root -g root -m 644 "${staged_dir}/compose.yml" "${deploy_dir}/compose.yml"
install -o root -g root -m 644 "${staged_dir}/Caddyfile" "${deploy_dir}/Caddyfile"
install -o root -g root -m 755 "${staged_dir}/bin/deploy-release.sh" "$release_script_path"

marker_temp="$(mktemp "${rollback_marker}.tmp.XXXXXX")"
printf '%s\n' "$backup_dir" >"$marker_temp"
chown root:root "$marker_temp"
chmod 600 "$marker_temp"
mv -- "$marker_temp" "$rollback_marker"

installation_succeeded=1
printf 'Deployment artifacts installed; rollback backup: %s\n' "$backup_dir"
printf 'No container was restarted. Run the fixed release only after AWS and production approval.\n'
