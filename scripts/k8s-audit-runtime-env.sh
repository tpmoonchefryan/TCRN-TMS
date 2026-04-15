#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Audit a runtime env file before turning it into the first-cut K3s secret.

set -euo pipefail

ENV_FILE="${ENV_FILE:-${1:-infra/k8s/runtime.env.example}}"
EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL:-}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

declare -a ERRORS=()
declare -a WARNINGS=()
ERROR_COUNT=0
WARNING_COUNT=0

add_error() {
  ERRORS+=("$1")
  ERROR_COUNT=$((ERROR_COUNT + 1))
}

add_warning() {
  WARNINGS+=("$1")
  WARNING_COUNT=$((WARNING_COUNT + 1))
}

get_env_value() {
  local wanted_key="$1"

  awk -v wanted_key="${wanted_key}" '
    /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
    {
      line = $0
      sub(/\r$/, "", line)
      pos = index(line, "=")
      if (pos == 0) {
        next
      }

      key = substr(line, 1, pos - 1)
      gsub(/^[[:space:]]+/, "", key)
      gsub(/[[:space:]]+$/, "", key)

      if (key != wanted_key) {
        next
      }

      print substr(line, pos + 1)
      exit
    }
  ' "${ENV_FILE}"
}

require_non_empty() {
  local key="$1"
  local value
  value="$(get_env_value "${key}")"
  if [[ -z "${value}" ]]; then
    add_error "Missing required non-empty key: ${key}"
  fi
}

extract_url_host() {
  local url="$1"
  local rest hostport
  rest="${url#*://}"
  rest="${rest#*@}"
  hostport="${rest%%/*}"
  hostport="${hostport%%\?*}"
  printf '%s\n' "${hostport%%:*}"
}

extract_url_path() {
  local url="$1"
  local rest path
  rest="${url#*://}"
  rest="${rest#*@}"
  if [[ "${rest}" == */* ]]; then
    path="/${rest#*/}"
    path="${path%%\?*}"
    printf '%s\n' "${path}"
    return
  fi
  printf '/\n'
}

extract_hostport_host() {
  local endpoint="$1"
  endpoint="${endpoint#http://}"
  endpoint="${endpoint#https://}"
  endpoint="${endpoint%%/*}"
  printf '%s\n' "${endpoint%%:*}"
}

is_loopback_host() {
  local host
  host="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  [[ "${host}" == "localhost" || "${host}" == "127.0.0.1" || "${host}" == "::1" ]]
}

is_compose_alias() {
  local host
  host="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  [[ "${host}" == "postgres" || "${host}" == "redis" || "${host}" == "minio" || "${host}" == "nats" || "${host}" == "api" || "${host}" == "web" || "${host}" == "caddy" ]]
}

require_non_empty "DATABASE_URL"
require_non_empty "REDIS_URL"
require_non_empty "MINIO_ENDPOINT"
require_non_empty "MINIO_ROOT_USER"
require_non_empty "MINIO_ROOT_PASSWORD"
require_non_empty "NATS_URL"
require_non_empty "JWT_SECRET"
require_non_empty "JWT_REFRESH_SECRET"
require_non_empty "FINGERPRINT_SECRET_KEY"
require_non_empty "NEXT_PUBLIC_API_URL"
require_non_empty "NEXT_PUBLIC_APP_URL"
require_non_empty "FRONTEND_URL"
require_non_empty "APP_URL"
require_non_empty "CORS_ORIGIN"
jwt_secret="$(get_env_value "JWT_SECRET")"
jwt_refresh_secret="$(get_env_value "JWT_REFRESH_SECRET")"
database_url="$(get_env_value "DATABASE_URL")"
redis_url="$(get_env_value "REDIS_URL")"
nats_url="$(get_env_value "NATS_URL")"
minio_endpoint="$(get_env_value "MINIO_ENDPOINT")"
next_public_api_url="$(get_env_value "NEXT_PUBLIC_API_URL")"
next_public_app_url="$(get_env_value "NEXT_PUBLIC_APP_URL")"
frontend_url="$(get_env_value "FRONTEND_URL")"
runtime_app_url="$(get_env_value "APP_URL")"
cors_origin="$(get_env_value "CORS_ORIGIN")"
tencent_ses_secret_id="$(get_env_value "TENCENT_SES_SECRET_ID")"
tencent_ses_secret_key="$(get_env_value "TENCENT_SES_SECRET_KEY")"
tencent_ses_from_address="$(get_env_value "TENCENT_SES_FROM_ADDRESS")"
email_config_encryption_key="$(get_env_value "EMAIL_CONFIG_ENCRYPTION_KEY")"

if [[ -n "${jwt_secret}" && ${#jwt_secret} -lt 32 ]]; then
  add_error "JWT_SECRET must be at least 32 characters."
fi

if [[ -n "${jwt_refresh_secret}" && ${#jwt_refresh_secret} -lt 32 ]]; then
  add_error "JWT_REFRESH_SECRET must be at least 32 characters."
fi

if [[ -n "${database_url}" ]]; then
  db_host="$(extract_url_host "${database_url}")"
  if is_loopback_host "${db_host}"; then
    add_error "DATABASE_URL points to loopback host ${db_host}. Pods cannot use localhost for same-host external PostgreSQL."
  fi
  if is_compose_alias "${db_host}"; then
    add_error "DATABASE_URL still points to Compose alias ${db_host}. Use a host IP or DNS name reachable from K3s pods."
  fi
fi

if [[ -n "${redis_url}" ]]; then
  redis_host="$(extract_url_host "${redis_url}")"
  if is_loopback_host "${redis_host}" || is_compose_alias "${redis_host}"; then
    add_error "REDIS_URL points to ${redis_host}. First-cut K3s should use the in-cluster Redis service."
  fi
fi

if [[ -n "${nats_url}" ]]; then
  nats_host="$(extract_url_host "${nats_url}")"
  if is_loopback_host "${nats_host}" || is_compose_alias "${nats_host}"; then
    add_error "NATS_URL points to ${nats_host}. First-cut K3s should use the in-cluster NATS service."
  fi
fi

if [[ -n "${minio_endpoint}" ]]; then
  minio_host="$(extract_hostport_host "${minio_endpoint}")"
  if is_loopback_host "${minio_host}" || is_compose_alias "${minio_host}"; then
    add_error "MINIO_ENDPOINT points to ${minio_host}. First-cut K3s should use the in-cluster MinIO service."
  fi
fi

if [[ -n "${next_public_api_url}" ]]; then
  api_path="$(extract_url_path "${next_public_api_url}")"
  if [[ "${api_path}" == "/api" || "${api_path}" == /api/* ]]; then
    add_error "NEXT_PUBLIC_API_URL includes ${api_path}. Keep it on the public origin only; the web client already appends /api/v1 paths."
  fi
fi

public_url_keys=("NEXT_PUBLIC_APP_URL" "NEXT_PUBLIC_API_URL" "FRONTEND_URL" "APP_URL")
for key in "${public_url_keys[@]}"; do
  value="$(get_env_value "${key}")"
  if [[ -n "${value}" && ! "${value}" =~ ^https?:// ]]; then
    add_error "${key} must start with http:// or https://"
  fi
done

if [[ -n "${next_public_app_url}" && -n "${frontend_url}" && "${next_public_app_url}" != "${frontend_url}" ]]; then
  add_warning "NEXT_PUBLIC_APP_URL and FRONTEND_URL differ. First-cut single-host production usually keeps them aligned."
fi

if [[ -n "${next_public_app_url}" && -n "${runtime_app_url}" && "${next_public_app_url}" != "${runtime_app_url}" ]]; then
  add_warning "NEXT_PUBLIC_APP_URL and APP_URL differ. First-cut single-host production usually keeps them aligned."
fi

if [[ -n "${next_public_app_url}" && -n "${next_public_api_url}" && "${next_public_app_url}" != "${next_public_api_url}" ]]; then
  add_warning "NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_API_URL differ. Confirm this is intentional; current first-cut routing assumes one public host."
fi

if [[ -n "${next_public_app_url}" && -n "${cors_origin}" && "${next_public_app_url}" != "${cors_origin}" ]]; then
  add_warning "NEXT_PUBLIC_APP_URL and CORS_ORIGIN differ. Confirm this is intentional for first-cut single-host production."
fi

if [[ -n "${EXPECTED_PUBLIC_URL}" ]]; then
  for key in NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL FRONTEND_URL APP_URL; do
    value="$(get_env_value "${key}")"
    if [[ -n "${value}" && "${value}" != "${EXPECTED_PUBLIC_URL}" ]]; then
      add_warning "${key} does not match EXPECTED_PUBLIC_URL=${EXPECTED_PUBLIC_URL}."
    fi
  done
fi

if [[ -n "${tencent_ses_secret_id}" || -n "${tencent_ses_secret_key}" || -n "${tencent_ses_from_address}" ]]; then
  if [[ -z "${tencent_ses_secret_id}" || -z "${tencent_ses_secret_key}" ]]; then
    add_warning "Tencent SES env fallback is only partially configured. If production uses stored SMTP config instead, prefer leaving all TENCENT_SES_* blank to avoid ambiguity."
  fi

  if [[ -n "${tencent_ses_secret_id}" && -n "${tencent_ses_secret_key}" && -z "${tencent_ses_from_address}" ]]; then
    add_warning "Tencent SES env fallback is missing TENCENT_SES_FROM_ADDRESS. Runtime will fall back to the default sender address."
  fi
else
  add_warning "Tencent SES env fallback is not configured in this runtime env. This is acceptable if production uses stored SMTP/email provider config instead; verify email configuration after bootstrap."
fi

if [[ -z "${email_config_encryption_key}" ]]; then
  add_warning "EMAIL_CONFIG_ENCRYPTION_KEY is blank. Set it before restoring or re-entering stored SMTP/email config, or runtime will fall back to the built-in development key."
fi

echo "Audited env file: ${ENV_FILE}"
echo "Errors: ${ERROR_COUNT}"
echo "Warnings: ${WARNING_COUNT}"

if (( ERROR_COUNT > 0 )); then
  for message in "${ERRORS[@]}"; do
    echo "ERROR: ${message}"
  done
fi

if (( WARNING_COUNT > 0 )); then
  for message in "${WARNINGS[@]}"; do
    echo "WARN: ${message}"
  done
fi

if (( ERROR_COUNT > 0 )); then
  exit 1
fi
