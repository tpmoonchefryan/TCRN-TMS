#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Run the optional schema rollout verification job for K3s.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
JOB_NAME="tcrn-db-verify-schema-rollout"
SECRET_NAME="${SECRET_NAME:-tcrn-runtime-env}"
TIMEOUT="${TIMEOUT:-900s}"
IMAGE_TAG="${IMAGE_TAG:-${1:-}}"
ROLLOUT_MIGRATIONS="${ROLLOUT_MIGRATIONS:-${2:-}}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/tpmoonchefryan/tcrn-tms/api}"
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-}"
MANIFEST_PATH="infra/k8s/jobs/db-verify-schema-rollout.yaml"

if [[ -z "${IMAGE_TAG}" || -z "${ROLLOUT_MIGRATIONS}" ]]; then
  echo "Usage: IMAGE_TAG=<tag> ROLLOUT_MIGRATIONS=<migration1,migration2> $0"
  echo "   or: $0 <tag> <migration1,migration2>"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

if [[ ! -f "${MANIFEST_PATH}" ]]; then
  echo "Manifest not found: ${MANIFEST_PATH}"
  exit 1
fi

if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Namespace does not exist: ${NAMESPACE}"
  exit 1
fi

if ! kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Runtime secret not found: ${SECRET_NAME} in namespace ${NAMESPACE}"
  exit 1
fi

if [[ -n "${REGISTRY_SECRET_NAME}" ]] && ! kubectl get secret "${REGISTRY_SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Registry secret not found: ${REGISTRY_SECRET_NAME} in namespace ${NAMESPACE}"
  exit 1
fi

TMP_MANIFEST="$(mktemp)"
trap 'rm -f "${TMP_MANIFEST}"' EXIT

sed \
  -e "s|ghcr.io/tpmoonchefryan/tcrn-tms/api:replace-me|${IMAGE_REPO}:${IMAGE_TAG}|g" \
  -e "s|namespace: tcrn|namespace: ${NAMESPACE}|g" \
  -e "s|value: replace-me-rollout-migrations|value: '${ROLLOUT_MIGRATIONS}'|g" \
  "${MANIFEST_PATH}" | if [[ -n "${REGISTRY_SECRET_NAME}" ]]; then
    awk -v registry_secret_name="${REGISTRY_SECRET_NAME}" '
      /# registry-secret-placeholder/ {
        indent = substr($0, 1, match($0, /[^ ]/) - 1)
        print indent "imagePullSecrets:"
        print indent "  - name: " registry_secret_name
        next
      }
      { print }
    '
  else
    awk '!/# registry-secret-placeholder/'
  fi > "${TMP_MANIFEST}"

kubectl delete job "${JOB_NAME}" -n "${NAMESPACE}" --ignore-not-found
kubectl apply -f "${TMP_MANIFEST}"
kubectl wait --for=condition=complete --timeout="${TIMEOUT}" "job/${JOB_NAME}" -n "${NAMESPACE}"
kubectl logs "job/${JOB_NAME}" -n "${NAMESPACE}"
