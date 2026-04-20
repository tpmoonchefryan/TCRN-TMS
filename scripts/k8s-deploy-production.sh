#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Apply the current non-destructive K3s baseline manifests.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
SECRET_NAME="${SECRET_NAME:-tcrn-runtime-env}"
APP_HOST="${APP_HOST:-}"
TLS_SECRET_NAME="${TLS_SECRET_NAME:-}"
INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME:-traefik}"
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-}"
API_TAG="${API_TAG:-${IMAGE_TAG:-}}"
WORKER_TAG="${WORKER_TAG:-${IMAGE_TAG:-}}"
API_REPO="${API_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/api}"
WORKER_REPO="${WORKER_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/worker}"

if [[ -z "${API_TAG}" || -z "${WORKER_TAG}" ]]; then
  echo "Set IMAGE_TAG for a shared release tag, or set API_TAG/WORKER_TAG explicitly."
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if ! kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Runtime secret not found: ${SECRET_NAME} in namespace ${NAMESPACE}"
  echo "Create the secret before applying runtime manifests."
  exit 1
fi

if [[ -n "${REGISTRY_SECRET_NAME}" ]] && ! kubectl get secret "${REGISTRY_SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Registry secret not found: ${REGISTRY_SECRET_NAME} in namespace ${NAMESPACE}"
  echo "Create the pull secret before applying private GHCR-backed workloads."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

render_manifest() {
  local source_path="$1"
  local target_path="$2"
  local rendered_path="${TMP_DIR}/$(basename "${target_path}").rendered"

  sed \
    -e "s|namespace: tcrn|namespace: ${NAMESPACE}|g" \
    -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/api:replace-me|${API_REPO}:${API_TAG}|g" \
    -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/worker:replace-me|${WORKER_REPO}:${WORKER_TAG}|g" \
    -e "s|replace-me.example.com|${APP_HOST}|g" \
    -e "s|replace-me-tls-secret|${TLS_SECRET_NAME}|g" \
    -e "s|replace-me-ingress-class|${INGRESS_CLASS_NAME}|g" \
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
}

kubectl apply -f infra/k8s/namespace.yaml

render_manifest infra/k8s/dependencies/redis.yaml "${TMP_DIR}/redis.yaml"
render_manifest infra/k8s/dependencies/minio.yaml "${TMP_DIR}/minio.yaml"
render_manifest infra/k8s/dependencies/nats.yaml "${TMP_DIR}/nats.yaml"
render_manifest infra/k8s/deployments/api.yaml "${TMP_DIR}/api.yaml"
render_manifest infra/k8s/deployments/worker.yaml "${TMP_DIR}/worker.yaml"

kubectl apply -f "${TMP_DIR}/redis.yaml"
kubectl apply -f "${TMP_DIR}/minio.yaml"
kubectl apply -f "${TMP_DIR}/nats.yaml"
kubectl apply -f "${TMP_DIR}/api.yaml"
kubectl apply -f "${TMP_DIR}/worker.yaml"

if [[ -f "infra/k8s/ingress/public.yaml" ]]; then
  if [[ -z "${APP_HOST}" || -z "${TLS_SECRET_NAME}" ]]; then
    echo "APP_HOST and TLS_SECRET_NAME are required when applying ingress/public.yaml."
    exit 1
  fi
  render_manifest infra/k8s/ingress/public.yaml "${TMP_DIR}/ingress-public.yaml"
  kubectl apply -f "${TMP_DIR}/ingress-public.yaml"
else
  echo "Skipping ingress: infra/k8s/ingress/public.yaml is not present yet."
fi

echo "Applied current K3s baseline manifests to namespace ${NAMESPACE}."
echo "Run scripts/k8s-run-db-bootstrap.sh after the workloads and runtime secret are ready."
