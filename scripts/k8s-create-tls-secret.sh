#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Create or update a Kubernetes TLS secret for the first-cut public ingress.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
SECRET_NAME="${SECRET_NAME:-tcrn-public-tls}"
CERT_FILE="${CERT_FILE:-${1:-}}"
KEY_FILE="${KEY_FILE:-${2:-}}"

if [[ -z "${CERT_FILE}" || -z "${KEY_FILE}" ]]; then
  echo "Usage: CERT_FILE=/path/to/fullchain.pem KEY_FILE=/path/to/privkey.pem $0"
  echo "   or: $0 /path/to/fullchain.pem /path/to/privkey.pem"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if [[ ! -f "${CERT_FILE}" ]]; then
  echo "Certificate file not found: ${CERT_FILE}"
  exit 1
fi

if [[ ! -f "${KEY_FILE}" ]]; then
  echo "Key file not found: ${KEY_FILE}"
  exit 1
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret tls "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --cert="${CERT_FILE}" \
  --key="${KEY_FILE}" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo "Applied TLS secret ${SECRET_NAME} in namespace ${NAMESPACE}."
