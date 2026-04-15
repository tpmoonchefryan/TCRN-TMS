#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Create or update the runtime secret for the first-cut K3s deployment.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
SECRET_NAME="${SECRET_NAME:-tcrn-runtime-env}"
ENV_FILE="${ENV_FILE:-${1:-infra/k8s/runtime.env.example}}"
EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL:-}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

if [[ -x "scripts/k8s-audit-runtime-env.sh" ]]; then
  EXPECTED_PUBLIC_URL="${EXPECTED_PUBLIC_URL}" scripts/k8s-audit-runtime-env.sh "${ENV_FILE}"
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --from-env-file="${ENV_FILE}" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo "Applied runtime secret ${SECRET_NAME} in namespace ${NAMESPACE} from ${ENV_FILE}."
