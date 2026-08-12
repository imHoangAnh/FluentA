#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
readonly repository_root
readonly compose_file="${repository_root}/deploy/production/compose.yml"
readonly env_template="${repository_root}/deploy/production/env.example"

fail() {
  printf 'Delivery policy validation failed: %s\n' "$1" >&2
  exit 1
}

[[ -f "$compose_file" ]] || fail 'production Compose file is missing'
[[ -f "$env_template" ]] || fail 'production environment template is missing'

docker compose \
  --env-file "$env_template" \
  --file "$compose_file" \
  config --quiet

grep -Eq '^API_IMAGE=[^[:space:]]+@sha256:[0-9a-f]{64}$' "$env_template" ||
  fail 'API_IMAGE example is not an immutable digest reference'
grep -Eq '^MIGRATIONS_IMAGE=[^[:space:]]+@sha256:[0-9a-f]{64}$' "$env_template" ||
  fail 'MIGRATIONS_IMAGE example is not an immutable digest reference'

if grep -Eq '^[[:space:]]+ports:' <(
  awk '
    /^  (postgres|migrations|api):$/ { service=$1; gsub(":", "", service); in_private=1; next }
    /^  [a-zA-Z0-9_-]+:$/ { in_private=0 }
    in_private { print }
  ' "$compose_file"
); then
  fail 'a private data or application service publishes a host port'
fi

if grep -InE '(^|[^[:alnum:]_])(latest)([^[:alnum:]_]|$)' \
  "$compose_file" \
  "${repository_root}/.github/workflows/deploy-backend.yml" >/dev/null; then
  fail 'mutable latest tag appears in production deployment files'
fi

printf 'Delivery policy validation passed.\n'
