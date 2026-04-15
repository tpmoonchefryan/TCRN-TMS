#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Create or update a GHCR pull secret for K3s workloads when private images are used.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
SECRET_NAME="${SECRET_NAME:-ghcr-pull-secret}"
REGISTRY="${REGISTRY:-ghcr.io}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-${GHCR_USERNAME:-}}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-${GHCR_TOKEN:-}}"
REGISTRY_EMAIL="${REGISTRY_EMAIL:-${GHCR_EMAIL:-devnull@example.com}}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if [[ -z "${REGISTRY_USERNAME}" || -z "${REGISTRY_PASSWORD}" ]]; then
  echo "Set REGISTRY_USERNAME/GHCR_USERNAME and REGISTRY_PASSWORD/GHCR_TOKEN before running."
  exit 1
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret docker-registry "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --docker-server="${REGISTRY}" \
  --docker-username="${REGISTRY_USERNAME}" \
  --docker-password="${REGISTRY_PASSWORD}" \
  --docker-email="${REGISTRY_EMAIL}" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo "Applied registry secret ${SECRET_NAME} in namespace ${NAMESPACE}."
