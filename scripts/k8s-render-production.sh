#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Render the current first-cut K3s production manifests without applying them.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
APP_HOST="${APP_HOST:-}"
TLS_SECRET_NAME="${TLS_SECRET_NAME:-}"
INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME:-traefik}"
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-}"
ROLLOUT_MIGRATIONS="${ROLLOUT_MIGRATIONS:-}"
WEB_TAG="${WEB_TAG:-${IMAGE_TAG:-}}"
API_TAG="${API_TAG:-${IMAGE_TAG:-}}"
WORKER_TAG="${WORKER_TAG:-${IMAGE_TAG:-}}"
WEB_REPO="${WEB_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/web}"
API_REPO="${API_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/api}"
WORKER_REPO="${WORKER_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/worker}"
OUTPUT_DIR="${OUTPUT_DIR:-${1:-./tmp/k8s-rendered}}"

if [[ -z "${WEB_TAG}" || -z "${API_TAG}" || -z "${WORKER_TAG}" ]]; then
  echo "Set IMAGE_TAG for a shared release tag, or set WEB_TAG/API_TAG/WORKER_TAG explicitly."
  exit 1
fi

mkdir -p "${OUTPUT_DIR}/dependencies" "${OUTPUT_DIR}/deployments" "${OUTPUT_DIR}/jobs" "${OUTPUT_DIR}/ingress"

render_manifest() {
  local source_path="$1"
  local target_path="$2"
  local rendered_path="${target_path}.rendered"

  sed \
    -e "s|namespace: tcrn|namespace: ${NAMESPACE}|g" \
    -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/web:replace-me|${WEB_REPO}:${WEB_TAG}|g" \
    -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/api:replace-me|${API_REPO}:${API_TAG}|g" \
    -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/worker:replace-me|${WORKER_REPO}:${WORKER_TAG}|g" \
    -e "s|replace-me.example.com|${APP_HOST}|g" \
    -e "s|replace-me-tls-secret|${TLS_SECRET_NAME}|g" \
    -e "s|replace-me-ingress-class|${INGRESS_CLASS_NAME}|g" \
    -e "s|value: replace-me-rollout-migrations|value: '${ROLLOUT_MIGRATIONS}'|g" \
    "${source_path}" > "${rendered_path}"

  if [[ -n "${REGISTRY_SECRET_NAME}" ]]; then
    awk -v registry_secret_name="${REGISTRY_SECRET_NAME}" '
      /# registry-secret-placeholder/ {
        indent = substr($0, 1, match($0, /[^ ]/) - 1)
        print indent "imagePullSecrets:"
        print indent "  - name: " registry_secret_name
        next
      }
      { print }
    ' "${rendered_path}" > "${target_path}"
  else
    awk '!/# registry-secret-placeholder/' "${rendered_path}" > "${target_path}"
  fi

  rm -f "${rendered_path}"
}

render_manifest "infra/k8s/namespace.yaml" "${OUTPUT_DIR}/namespace.yaml"
render_manifest "infra/k8s/dependencies/redis.yaml" "${OUTPUT_DIR}/dependencies/redis.yaml"
render_manifest "infra/k8s/dependencies/minio.yaml" "${OUTPUT_DIR}/dependencies/minio.yaml"
render_manifest "infra/k8s/dependencies/nats.yaml" "${OUTPUT_DIR}/dependencies/nats.yaml"
render_manifest "infra/k8s/deployments/api.yaml" "${OUTPUT_DIR}/deployments/api.yaml"
render_manifest "infra/k8s/deployments/web.yaml" "${OUTPUT_DIR}/deployments/web.yaml"
render_manifest "infra/k8s/deployments/worker.yaml" "${OUTPUT_DIR}/deployments/worker.yaml"
render_manifest "infra/k8s/jobs/db-bootstrap.yaml" "${OUTPUT_DIR}/jobs/db-bootstrap.yaml"

if [[ -n "${ROLLOUT_MIGRATIONS}" ]]; then
  render_manifest "infra/k8s/jobs/db-verify-schema-rollout.yaml" "${OUTPUT_DIR}/jobs/db-verify-schema-rollout.yaml"
fi

if [[ -f "infra/k8s/ingress/public.yaml" ]]; then
  if [[ -n "${APP_HOST}" && -n "${TLS_SECRET_NAME}" ]]; then
    render_manifest "infra/k8s/ingress/public.yaml" "${OUTPUT_DIR}/ingress/public.yaml"
  else
    echo "Skipping ingress render: APP_HOST and TLS_SECRET_NAME are required."
  fi
fi

echo "Rendered first-cut K3s manifests to ${OUTPUT_DIR}"
