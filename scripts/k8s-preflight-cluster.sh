#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Read-only preflight checks for the first-cut K3s production path.

set -euo pipefail

NAMESPACE="${NAMESPACE:-tcrn}"
INGRESS_CLASS_NAME="${INGRESS_CLASS_NAME:-}"
SECRET_NAME="${SECRET_NAME:-tcrn-runtime-env}"
REGISTRY_SECRET_NAME="${REGISTRY_SECRET_NAME:-ghcr-pull-secret}"
REQUIRE_NAMESPACE="${REQUIRE_NAMESPACE:-0}"
REQUIRE_RUNTIME_SECRET="${REQUIRE_RUNTIME_SECRET:-0}"
REQUIRE_REGISTRY_SECRET="${REQUIRE_REGISTRY_SECRET:-0}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required."
  exit 1
fi

echo "== Host =="
hostname
uname -a

echo "== K3s service =="
if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files k3s.service >/dev/null 2>&1; then
    systemctl is-active k3s || true
    systemctl is-enabled k3s || true
  else
    echo "k3s.service not found"
  fi
else
  echo "systemctl not available"
fi

echo "== Kubernetes API =="
kubectl cluster-info >/dev/null
kubectl get nodes -o wide

echo "== Ingress classes =="
kubectl get ingressclass || true

if [[ -n "${INGRESS_CLASS_NAME}" ]]; then
  if ! kubectl get ingressclass "${INGRESS_CLASS_NAME}" >/dev/null 2>&1; then
    echo "Required ingress class not found: ${INGRESS_CLASS_NAME}"
    exit 1
  fi
  echo "Found required ingress class: ${INGRESS_CLASS_NAME}"
fi

echo "== Namespace =="
if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Found namespace: ${NAMESPACE}"
else
  echo "Namespace not found yet: ${NAMESPACE}"
  if [[ "${REQUIRE_NAMESPACE}" == "1" ]]; then
    exit 1
  fi
fi

echo "== Runtime secret =="
if kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Found runtime secret: ${SECRET_NAME}"
else
  echo "Runtime secret not found: ${SECRET_NAME}"
  if [[ "${REQUIRE_RUNTIME_SECRET}" == "1" ]]; then
    exit 1
  fi
fi

echo "== Registry secret =="
if kubectl get secret "${REGISTRY_SECRET_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Found registry secret: ${REGISTRY_SECRET_NAME}"
else
  echo "Registry secret not found: ${REGISTRY_SECRET_NAME}"
  if [[ "${REQUIRE_REGISTRY_SECRET}" == "1" ]]; then
    exit 1
  fi
fi

echo "== Current objects in namespace ${NAMESPACE} =="
kubectl get all -n "${NAMESPACE}" 2>/dev/null || true

echo "Preflight checks completed."
