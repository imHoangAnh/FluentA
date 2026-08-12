#!/usr/bin/env bash
set -Eeuo pipefail

readonly installer="/repo/deploy/production/bin/install-deployment-artifacts.sh"
test_root="$(mktemp -d)"
readonly test_root

cleanup() {
  rm -rf -- "$test_root"
}
trap cleanup EXIT

fail() {
  printf 'Artifact installer test failed: %s\n' "$1" >&2
  exit 1
}

make_case() {
  local case_name="$1"
  local case_dir="${test_root}/${case_name}"
  mkdir -p \
    "${case_dir}/bin" \
    "${case_dir}/current" \
    "${case_dir}/runtime" \
    "${case_dir}/shared/releases" \
    "${case_dir}/shared/deployment-backups" \
    "${case_dir}/staged/bin"

  printf 'old compose\n' >"${case_dir}/current/compose.yml"
  printf 'old caddy\n' >"${case_dir}/current/Caddyfile"
  printf '#!/usr/bin/env bash\n# old release\n' >"${case_dir}/runtime/deploy-release.sh"
  chmod 755 "${case_dir}/runtime/deploy-release.sh"

  cat >"${case_dir}/shared/production.env" <<'EOF'
FRONTEND_IMAGE=caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
CADDY_ACME_EMAIL=ops@example.com
TEST_SECRET=must-not-appear-in-output
EOF
  chmod 600 "${case_dir}/shared/production.env"

  printf 'new compose\n' >"${case_dir}/staged/compose.yml"
  printf 'new caddy\n' >"${case_dir}/staged/Caddyfile"
  printf '#!/usr/bin/env bash\n# new release\n' >"${case_dir}/staged/bin/deploy-release.sh"
  chmod 755 "${case_dir}/staged/bin/deploy-release.sh"
  cp -- "$installer" "${case_dir}/staged/bin/install-deployment-artifacts.sh"
  (
    cd -- "${case_dir}/staged"
    sha256sum \
      Caddyfile compose.yml bin/deploy-release.sh bin/install-deployment-artifacts.sh \
      >SHA256SUMS
  )

  cat >"${case_dir}/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >>"${MOCK_CASE_DIR}/docker-calls"
case "${1:-}" in
  compose)
    ;;
  run)
    [[ "${MOCK_CADDY_VALIDATE_FAIL:-0}" -eq 0 ]] || exit 44
    ;;
  *)
    exit 91
    ;;
esac
EOF
  chmod 755 "${case_dir}/bin/docker"

  printf '%s\n' "$case_dir"
}

run_installer() {
  local case_dir="$1"
  shift
  local manifest_sha
  manifest_sha="${MOCK_MANIFEST_SHA:-$(sha256sum "${case_dir}/staged/SHA256SUMS" | awk '{print $1}')}"
  env \
    PATH="${case_dir}/bin:${PATH}" \
    MOCK_CASE_DIR="$case_dir" \
    FLUENTA_DEPLOY_DIR="${case_dir}/current" \
    FLUENTA_ENV_FILE="${case_dir}/shared/production.env" \
    FLUENTA_RELEASE_SCRIPT_PATH="${case_dir}/runtime/deploy-release.sh" \
    FLUENTA_CONFIG_BACKUP_ROOT="${case_dir}/shared/deployment-backups" \
    FLUENTA_CONFIG_ROLLBACK_MARKER="${case_dir}/shared/releases/pending-config-rollback" \
    FLUENTA_RELEASE_LOCK_FILE="${case_dir}/deploy.lock" \
    "$@" \
    bash "$installer" "${case_dir}/staged" \
      "$manifest_sha"
}

digest_case="$(make_case invalid-manifest-digest)"
if MOCK_MANIFEST_SHA='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
  run_installer "$digest_case" >"${digest_case}/output" 2>&1; then
  fail 'untrusted SHA256SUMS digest was accepted'
fi
grep -q 'does not match the operator-approved manifest digest' \
  "${digest_case}/output" || fail 'manifest digest failure was not explicit'

permissions_case="$(make_case writable-staging)"
chmod 666 "${permissions_case}/staged/Caddyfile"
if run_installer "$permissions_case" >"${permissions_case}/output" 2>&1; then
  fail 'group- or world-writable staging was accepted'
fi
grep -q 'must not be group- or world-writable' "${permissions_case}/output" ||
  fail 'writable staging failure was not explicit'

manifest_case="$(make_case invalid-manifest)"
printf '%064d  unapproved.txt\n' 0 >>"${manifest_case}/staged/SHA256SUMS"
if run_installer "$manifest_case" >"${manifest_case}/output" 2>&1; then
  fail 'manifest with an unapproved artifact was accepted'
fi
grep -q '^old compose$' "${manifest_case}/current/compose.yml" ||
  fail 'invalid manifest changed the current Compose file'

caddy_case="$(make_case invalid-caddy)"
if run_installer "$caddy_case" MOCK_CADDY_VALIDATE_FAIL=1 >"${caddy_case}/output" 2>&1; then
  fail 'invalid staged Caddyfile was accepted'
fi
grep -q '^old caddy$' "${caddy_case}/current/Caddyfile" ||
  fail 'invalid Caddyfile changed the current Caddyfile'
[[ ! -f "${caddy_case}/shared/releases/pending-config-rollback" ]] ||
  fail 'invalid Caddyfile created a rollback marker'

success_case="$(make_case success)"
run_installer "$success_case" >"${success_case}/output" 2>&1
grep -q '^new compose$' "${success_case}/current/compose.yml" ||
  fail 'new Compose file was not installed'
grep -q '^new caddy$' "${success_case}/current/Caddyfile" ||
  fail 'new Caddyfile was not installed'
grep -q '^# new release$' "${success_case}/runtime/deploy-release.sh" ||
  fail 'new release script was not installed'

marker="${success_case}/shared/releases/pending-config-rollback"
[[ -f "$marker" ]] || fail 'successful installation did not create a rollback marker'
backup_dir="$(cat "$marker")"
case "$backup_dir" in
  "${success_case}/shared/deployment-backups"/*) ;;
  *) fail 'rollback marker points outside the configured backup root' ;;
esac
grep -q '^old compose$' "${backup_dir}/compose.yml" ||
  fail 'previous Compose file was not backed up'
grep -q '^old caddy$' "${backup_dir}/Caddyfile" ||
  fail 'previous Caddyfile was not backed up'
grep -q '^# old release$' "${backup_dir}/deploy-release.sh" ||
  fail 'previous release script was not backed up'
if grep -Eq '(^| )up( |$)|restart' "${success_case}/docker-calls"; then
  fail 'artifact installation restarted a production container'
fi

if grep -R 'must-not-appear-in-output' \
  "${digest_case}/output" "${permissions_case}/output" \
  "${manifest_case}/output" "${caddy_case}/output" "${success_case}/output"; then
  fail 'production environment content leaked to installer output'
fi

printf 'Artifact installer tests passed.\n'
