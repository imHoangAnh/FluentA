#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
readonly repository_root
readonly compose_file="${repository_root}/deploy/production/compose.yml"
readonly env_template="${repository_root}/deploy/production/env.example"
readonly frontend_dockerfile="${repository_root}/src/frontend/Dockerfile"
readonly deploy_workflow="${repository_root}/.github/workflows/deploy-backend.yml"
readonly ec2_ecr_policy="${repository_root}/deploy/production/aws/ec2-ecr-pull-policy.json"
readonly github_deploy_policy="${repository_root}/deploy/production/aws/github-deploy-permissions-policy.json"

fail() {
  printf 'Delivery policy validation failed: %s\n' "$1" >&2
  exit 1
}

[[ -f "$compose_file" ]] || fail 'production Compose file is missing'
[[ -f "$env_template" ]] || fail 'production environment template is missing'
[[ -f "$frontend_dockerfile" ]] || fail 'production frontend Dockerfile is missing'
[[ -f "$deploy_workflow" ]] || fail 'production deployment workflow is missing'

docker compose \
  --env-file "$env_template" \
  --file "$compose_file" \
  config --quiet

grep -Eq '^API_IMAGE=[^[:space:]]+@sha256:[0-9a-f]{64}$' "$env_template" ||
  fail 'API_IMAGE example is not an immutable digest reference'
grep -Eq '^MIGRATIONS_IMAGE=[^[:space:]]+@sha256:[0-9a-f]{64}$' "$env_template" ||
  fail 'MIGRATIONS_IMAGE example is not an immutable digest reference'
grep -Eq '^FRONTEND_IMAGE=[^[:space:]]+@sha256:[0-9a-f]{64}$' "$env_template" ||
  fail 'FRONTEND_IMAGE example is not an immutable digest reference'
grep -Fq "image: \${FRONTEND_IMAGE:?FRONTEND_IMAGE must be an immutable digest reference}" \
  "$compose_file" || fail 'Caddy does not consume the immutable frontend image reference'

mapfile -t frontend_build_args < <(sed -n 's/^ARG //p' "$frontend_dockerfile" | sort -u)
expected_frontend_build_args=(VCS_REF VITE_API_URL VITE_GOOGLE_CLIENT_ID)
[[ "${frontend_build_args[*]}" == "${expected_frontend_build_args[*]}" ]] ||
  fail 'frontend Docker build arguments exceed the approved public allowlist'
grep -Fq 'VITE_API_URL=https://api.sophion.io.vn/api/v1' "$deploy_workflow" ||
  fail 'production frontend API URL is not fixed to the approved HTTPS origin'
grep -Fq "VITE_GOOGLE_CLIENT_ID=\${{ vars.VITE_GOOGLE_CLIENT_ID }}" "$deploy_workflow" ||
  fail 'frontend Google client ID is not sourced from the production environment variable'
if grep -Ei 'build-args:.*(secret|password|token|api[_-]?key|private[_-]?key)' "$deploy_workflow" >/dev/null; then
  fail 'a secret-like value is configured as a Docker build argument'
fi

for policy_file in "$ec2_ecr_policy" "$github_deploy_policy"; do
  for repository_name in \
    fluenta-production-api \
    fluenta-production-migrations \
    fluenta-production-web; do
    [[ "$(grep -c "repository/${repository_name}\"" "$policy_file")" -eq 1 ]] ||
      fail "$(basename "$policy_file") must scope exactly one ${repository_name} ARN"
  done
  [[ "$(grep -c 'arn:aws:ecr:.*:repository/' "$policy_file")" -eq 3 ]] ||
    fail "$(basename "$policy_file") contains an unexpected ECR repository scope"
done

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
  "$deploy_workflow" >/dev/null; then
  fail 'mutable latest tag appears in production deployment files'
fi

printf 'Delivery policy validation passed.\n'
