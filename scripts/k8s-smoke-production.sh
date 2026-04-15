#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Run the minimum post-cutover smoke checks for the first-cut K3s production path.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
APP_HOST="${APP_HOST:-${1:-}}"
SCHEME="${SCHEME:-https}"
SKIP_TLS_VERIFY="${SKIP_TLS_VERIFY:-0}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-20}"

if [[ -z "${APP_HOST}" ]]; then
  echo "Usage: APP_HOST=<host> $0"
  echo "   or: $0 <host>"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi

BASE_URL="${SCHEME}://${APP_HOST}"
CURL_COMMON_ARGS=(--silent --show-error --fail --max-time "${REQUEST_TIMEOUT}")

if [[ "${SKIP_TLS_VERIFY}" == "1" ]]; then
  CURL_COMMON_ARGS+=(-k)
fi

echo "== Kubernetes objects =="
kubectl get pods -n "${NAMESPACE}"
kubectl get svc -n "${NAMESPACE}"
kubectl get ingress -n "${NAMESPACE}"

echo "== Public smoke checks =="
echo "Checking ${BASE_URL}/"
curl "${CURL_COMMON_ARGS[@]}" --head "${BASE_URL}/" >/dev/null

echo "Checking ${BASE_URL}/api/v1/health/ready"
curl "${CURL_COMMON_ARGS[@]}" "${BASE_URL}/api/v1/health/ready" >/dev/null

echo "Checking ${BASE_URL}/api/live-status"
curl "${CURL_COMMON_ARGS[@]}" "${BASE_URL}/api/live-status" >/dev/null

echo "Checking ${BASE_URL}/api/docs"
curl "${CURL_COMMON_ARGS[@]}" --head "${BASE_URL}/api/docs" >/dev/null

echo "Smoke checks passed for ${BASE_URL}."
