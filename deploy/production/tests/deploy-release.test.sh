#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_script="/repo/deploy/production/bin/deploy-release.sh"
test_root="$(mktemp -d)"
readonly test_root

cleanup() {
  rm -rf -- "$test_root"
}
trap cleanup EXIT

fail() {
  printf 'Release script test failed: %s\n' "$1" >&2
  exit 1
}

make_case() {
  local case_name="$1"
  local case_dir="${test_root}/${case_name}"
  mkdir -p "${case_dir}/bin" "${case_dir}/deploy" "${case_dir}/shared"
  : >"${case_dir}/deploy/compose.yml"

  cat >"${case_dir}/shared/production.env" <<'EOF'
API_IMAGE=old.example/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
MIGRATIONS_IMAGE=old.example/migrations@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
TEST_SECRET=must-not-appear-in-output
EOF
  chmod 600 "${case_dir}/shared/production.env"

  cat >"${case_dir}/backup.sh" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
: >"${MOCK_CASE_DIR}/backup-ran"
EOF
  chmod 755 "${case_dir}/backup.sh"

  cat >"${case_dir}/bin/aws" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
case "$*" in
  *'describe-images'*'fluenta-production-api'*)
    printf 'sha256:%064d\n' 0 | tr '0' 'c'
    ;;
  *'describe-images'*'fluenta-production-migrations'*)
    printf 'sha256:%064d\n' 0 | tr '0' 'd'
    ;;
  *'get-login-password'*)
    printf 'short-lived-test-token\n'
    ;;
  *)
    printf 'Unexpected mock aws invocation.\n' >&2
    exit 91
    ;;
esac
EOF
  chmod 755 "${case_dir}/bin/aws"

  cat >"${case_dir}/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
exit 0
EOF
  chmod 755 "${case_dir}/bin/curl"

  cat >"${case_dir}/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
case "${1:-}" in
  login)
    cat >/dev/null
    ;;
  pull)
    ;;
  inspect)
    printf 'healthy\n'
    ;;
  compose)
    case " $* " in
      *' config --quiet '*)
        config_count_file="${MOCK_CASE_DIR}/config-count"
        config_count=0
        [[ ! -f "$config_count_file" ]] || config_count="$(cat "$config_count_file")"
        config_count=$((config_count + 1))
        printf '%s\n' "$config_count" >"$config_count_file"
        if [[ "$config_count" -ge 2 && "${MOCK_PRE_MIGRATION_FAIL:-0}" -eq 1 ]]; then
          exit 43
        fi
        ;;
      *' run --rm migrations '*)
        [[ "${MOCK_MIGRATION_FAIL:-0}" -eq 0 ]] || exit 42
        ;;
      *' up --detach --no-deps api '*)
        ;;
      *' ps --quiet api '*)
        printf 'mock-api-container\n'
        ;;
      *)
        printf 'Unexpected mock docker compose invocation.\n' >&2
        exit 92
        ;;
    esac
    ;;
  *)
    printf 'Unexpected mock docker invocation.\n' >&2
    exit 93
    ;;
esac
EOF
  chmod 755 "${case_dir}/bin/docker"

  printf '%s\n' "$case_dir"
}

run_release() {
  local case_dir="$1"
  local sha="$2"
  shift 2
  env \
    PATH="${case_dir}/bin:${PATH}" \
    MOCK_CASE_DIR="$case_dir" \
    FLUENTA_DEPLOY_DIR="${case_dir}/deploy" \
    FLUENTA_ENV_FILE="${case_dir}/shared/production.env" \
    FLUENTA_BACKUP_SCRIPT="${case_dir}/backup.sh" \
    FLUENTA_RELEASE_STATE_DIR="${case_dir}/shared/releases" \
    FLUENTA_RELEASE_LOCK_FILE="${case_dir}/deploy.lock" \
    "$@" \
    bash "$release_script" "$sha"
}

invalid_case="$(make_case invalid-sha)"
if run_release "$invalid_case" 'not-a-sha' >"${invalid_case}/output" 2>&1; then
  fail 'invalid SHA was accepted'
fi
grep -q 'expected exactly one lowercase 40-character Git commit SHA' \
  "${invalid_case}/output" || fail 'invalid SHA failure was not explicit'

lock_case="$(make_case concurrent-lock)"
exec 8>"${lock_case}/deploy.lock"
flock -n 8 || fail 'test could not acquire release lock'
if run_release "$lock_case" '3333333333333333333333333333333333333333' \
  >"${lock_case}/output" 2>&1; then
  fail 'concurrent release lock was ignored'
fi
grep -q 'another production release is already running' \
  "${lock_case}/output" || fail 'concurrent release failure was not explicit'
exec 8>&-

pre_migration_case="$(make_case pre-migration-failure)"
pre_migration_sha='4444444444444444444444444444444444444444'
if run_release "$pre_migration_case" "$pre_migration_sha" \
  MOCK_PRE_MIGRATION_FAIL=1 >"${pre_migration_case}/output" 2>&1; then
  fail 'pre-migration configuration failure was reported as success'
fi
grep -q '^API_IMAGE=old.example/api@sha256:' \
  "${pre_migration_case}/shared/production.env" ||
  fail 'prior API reference was not restored before migration'
grep -q '^MIGRATIONS_IMAGE=old.example/migrations@sha256:' \
  "${pre_migration_case}/shared/production.env" ||
  fail 'prior migration reference was not restored before migration'
grep -q 'Previous image references restored before migration' \
  "${pre_migration_case}/output" || fail 'pre-migration rollback was not reported'
if grep -q 'automatic image or database rollback is prohibited' \
  "${pre_migration_case}/output"; then
  fail 'pre-migration failure entered the post-migration recovery path'
fi

success_case="$(make_case success)"
success_sha='1111111111111111111111111111111111111111'
run_release "$success_case" "$success_sha" >"${success_case}/output" 2>&1
[[ -f "${success_case}/backup-ran" ]] || fail 'backup did not run'
grep -q "^RELEASE_SHA=${success_sha}$" "${success_case}/shared/releases/current" ||
  fail 'successful release state was not recorded'
grep -q '^API_IMAGE=178868337284.dkr.ecr.ap-southeast-1.amazonaws.com/fluenta-production-api@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc$' \
  "${success_case}/shared/production.env" || fail 'API digest was not installed'
grep -q '^MIGRATIONS_IMAGE=178868337284.dkr.ecr.ap-southeast-1.amazonaws.com/fluenta-production-migrations@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd$' \
  "${success_case}/shared/production.env" || fail 'migration digest was not installed'

migration_case="$(make_case migration-failure)"
migration_sha='2222222222222222222222222222222222222222'
if run_release "$migration_case" "$migration_sha" MOCK_MIGRATION_FAIL=1 \
  >"${migration_case}/output" 2>&1; then
  fail 'migration failure was reported as success'
fi
grep -q 'automatic image or database rollback is prohibited' \
  "${migration_case}/output" || fail 'migration recovery boundary was not explicit'
[[ ! -f "${migration_case}/shared/releases/current" ]] ||
  fail 'failed migration was recorded as a successful release'
grep -q '^API_IMAGE=178868337284.dkr.ecr.ap-southeast-1.amazonaws.com/fluenta-production-api@sha256:' \
  "${migration_case}/shared/production.env" ||
  fail 'post-migration-start references were rolled back automatically'

if grep -R 'must-not-appear-in-output' \
  "${invalid_case}/output" "${lock_case}/output" \
  "${pre_migration_case}/output" "${success_case}/output" \
  "${migration_case}/output"; then
  fail 'production environment content leaked to output'
fi

printf 'Release script tests passed.\n'
