#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Local readiness check for the first-cut K3s production path.
#
# Default behavior:
# - transform Compose-oriented env into a K3s runtime env
# - audit the runtime env
# - render the current manifests for review
# - verify no render placeholders remain
#
# Optional:
# - RUN_CLUSTER_PREFLIGHT=1 also runs the read-only cluster preflight script

set -euo pipefail

SOURCE_ENV="${SOURCE_ENV:-.env.production.example}"
RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-./tmp/k8s-readiness/runtime.env}"
RENDER_OUTPUT_DIR="${RENDER_OUTPUT_DIR:-./tmp/k8s-readiness/rendered}"
EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL:-${APP_HOST:+https://${APP_HOST}}}"
RUN_CLUSTER_PREFLIGHT="${RUN_CLUSTER_PREFLIGHT:-0}"

IMAGE_TAG="${IMAGE_TAG:-}"
APP_HOST="${APP_HOST:-}"
TLS_SECRET_NAME="${TLS_SECRET_NAME:-}"
INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME:-traefik}"
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-}"
ROLLOUT_MIGRATIONS="${ROLLOUT_MIGRATIONS:-}"
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DATABASE_URL_OVERRIDE="${DATABASE_URL_OVERRIDE:-}"
REDIS_HOST="${REDIS_HOST:-tcrn-redis.tcrn.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_URL_OVERRIDE="${REDIS_URL_OVERRIDE:-}"
MINIO_ENDPOINT_OUTPUT="${MINIO_ENDPOINT_OUTPUT:-tcrn-minio.tcrn.svc.cluster.local:9000}"
MINIO_USE_SSL_OUTPUT="${MINIO_USE_SSL_OUTPUT:-}"
NATS_URL_OUTPUT="${NATS_URL_OUTPUT:-nats://tcrn-nats.tcrn.svc.cluster.local:4222}"
NAMESPACE="${NAMESPACE:-tcrn}"

if [[ -z "${IMAGE_TAG}" ]]; then
  echo "Set IMAGE_TAG before running readiness."
  exit 1
fi

if [[ -z "${APP_HOST}" ]]; then
  echo "Set APP_HOST before running readiness."
  exit 1
fi

if [[ -z "${TLS_SECRET_NAME}" ]]; then
  echo "Set TLS_SECRET_NAME before running readiness."
  exit 1
fi

mkdir -p "$(dirname "${RUNTIME_ENV_FILE}")" "${RENDER_OUTPUT_DIR}"

echo "== Step 1: Transform source env =="
EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL}" \
DB_HOST="${DB_HOST}" \
DB_PORT="${DB_PORT}" \
DATABASE_URL_OVERRIDE="${DATABASE_URL_OVERRIDE}" \
REDIS_HOST="${REDIS_HOST}" \
REDIS_PORT="${REDIS_PORT}" \
REDIS_URL_OVERRIDE="${REDIS_URL_OVERRIDE}" \
MINIO_ENDPOINT_OUTPUT="${MINIO_ENDPOINT_OUTPUT}" \
MINIO_USE_SSL_OUTPUT="${MINIO_USE_SSL_OUTPUT}" \
NATS_URL_OUTPUT="${NATS_URL_OUTPUT}" \
bash scripts/k8s-transform-compose-env.sh "${SOURCE_ENV}" "${RUNTIME_ENV_FILE}"

echo "== Step 2: Audit transformed runtime env =="
EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL}" bash scripts/k8s-audit-runtime-env.sh "${RUNTIME_ENV_FILE}"

echo "== Step 3: Render manifests =="
IMAGE_TAG="${IMAGE_TAG}" \
APP_HOST="${APP_HOST}" \
TLS_SECRET_NAME="${TLS_SECRET_NAME}" \
INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME}" \
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME}" \
ROLLOUT_MIGRATIONS="${ROLLOUT_MIGRATIONS}" \
OUTPUT_DIR="${RENDER_OUTPUT_DIR}" \
bash scripts/k8s-render-production.sh

echo "== Step 4: Check rendered output for unresolved placeholders =="
if rg -n "replace-me|registry-secret-placeholder" "${RENDER_OUTPUT_DIR}" >/dev/null 2>&1; then
  echo "Rendered output still contains unresolved placeholders."
  exit 1
fi

echo "Rendered output is free of template placeholders."

if [[ "${RUN_CLUSTER_PREFLIGHT}" == "1" ]]; then
  echo "== Step 5: Cluster preflight =="
  NAMESPACE="${NAMESPACE}" \
  INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME}" \
  SECRET_NAME="tcrn-runtime-env" \
  REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-ghcr-pull-secret}" \
  REQUIRE_NAMESPACE=0 \
  REQUIRE_RUNTIME_SECRET=0 \
  REQUIRE_REGISTRY_SECRET=0 \
  bash scripts/k8s-preflight-cluster.sh
else
  echo "== Step 5: Cluster preflight skipped =="
  echo "Set RUN_CLUSTER_PREFLIGHT=1 when a live cluster is available."
fi

echo "Readiness check passed."
echo "Runtime env: ${RUNTIME_ENV_FILE}"
echo "Rendered manifests: ${RENDER_OUTPUT_DIR}"
