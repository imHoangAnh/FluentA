#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly source_file="${1:-/opt/fluenta/shared/production.env.example}"
readonly target_file="${2:-/opt/fluenta/shared/production.env}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command is unavailable: %s\n' "$1" >&2
    exit 1
  }
}

require_command openssl

[[ "${EUID}" -eq 0 ]] || {
  printf 'Run this initializer with sudo.\n' >&2
  exit 1
}

[[ -f "$source_file" ]] || {
  printf 'Production environment template is unavailable: %s\n' "$source_file" >&2
  exit 1
}

[[ ! -e "$target_file" ]] || {
  printf 'Refusing to overwrite existing production configuration: %s\n' "$target_file" >&2
  exit 1
}

postgres_password="$(openssl rand -hex 32)"
jwt_key="$(openssl rand -base64 48 | tr -d '\n')"
otp_hash_key="$(openssl rand -base64 48 | tr -d '\n')"
temporary_file="$(mktemp "${target_file}.tmp.XXXXXX")"

cleanup() {
  rm -f -- "$temporary_file"
}
trap cleanup EXIT

while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
    POSTGRES_PASSWORD=*)
      printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
      ;;
    JWT_KEY=*)
      printf 'JWT_KEY=%s\n' "$jwt_key"
      ;;
    OTP_HASH_KEY=*)
      printf 'OTP_HASH_KEY=%s\n' "$otp_hash_key"
      ;;
    *)
      printf '%s\n' "$line"
      ;;
  esac
done <"$source_file" >"$temporary_file"

chown root:root "$temporary_file"
chmod 600 "$temporary_file"
mv -- "$temporary_file" "$target_file"
trap - EXIT

printf 'Production environment initialized at %s.\n' "$target_file"
printf 'Generated secrets were written directly to the owner-only file and were not printed.\n'
printf 'Provider placeholders and immutable image references still require operator input.\n'
