#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Export current Caddy-managed TLS material from the legacy Docker volume for K3s ingress reuse.

set -euo pipefail

DOMAIN="${DOMAIN:-${1:-}}"
OUTPUT_DIR="${OUTPUT_DIR:-${2:-}}"
CADDY_DATA_VOLUME="${CADDY_DATA_VOLUME:-tcrn-caddy-data}"
CADDY_DATA_DIR="${CADDY_DATA_DIR:-}"
FORCE="${FORCE:-0}"

usage() {
  cat <<'EOF'
Usage:
  DOMAIN=web.prod.tcrn-tms.com OUTPUT_DIR=/secure/path bash scripts/host-export-caddy-tls.sh

Optional overrides:
  CADDY_DATA_VOLUME=tcrn-caddy-data
  CADDY_DATA_DIR=/var/lib/docker/volumes/tcrn-caddy-data/_data
  FORCE=1

Notes:
  - Run this on the legacy Compose/Caddy host before any reset or runtime removal.
  - The script copies the current certificate and private key into OUTPUT_DIR as:
    - fullchain.pem
    - privkey.pem
  - Existing files are not overwritten unless FORCE=1.
EOF
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

if [[ -z "${DOMAIN}" || -z "${OUTPUT_DIR}" ]]; then
  usage
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker is required to inspect the legacy Caddy volume."
fi

if [[ -z "${CADDY_DATA_DIR}" ]]; then
  CADDY_DATA_DIR="$(docker volume inspect "${CADDY_DATA_VOLUME}" --format '{{ .Mountpoint }}' 2>/dev/null || true)"
fi

if [[ -z "${CADDY_DATA_DIR}" || ! -d "${CADDY_DATA_DIR}" ]]; then
  fail "Could not resolve a readable Caddy data directory. Set CADDY_DATA_DIR explicitly if needed."
fi

CERT_BASE="${CADDY_DATA_DIR%/}/caddy/certificates"
if [[ ! -d "${CERT_BASE}" ]]; then
  fail "Certificate base directory not found: ${CERT_BASE}"
fi

CERT_SOURCE="$(find "${CERT_BASE}" -type f -path "*/${DOMAIN}/${DOMAIN}.crt" -print -quit 2>/dev/null || true)"
if [[ -z "${CERT_SOURCE}" ]]; then
  AVAILABLE_DOMAINS="$(
    find "${CERT_BASE}" -type f -name '*.crt' -print 2>/dev/null \
      | sed 's#.*/##' \
      | sed 's#\.crt$##' \
      | sort -u \
      | paste -sd ', ' -
  )"
  fail "Certificate for ${DOMAIN} was not found under ${CERT_BASE}. Available domains: ${AVAILABLE_DOMAINS:-none}"
fi

KEY_SOURCE="${CERT_SOURCE%.crt}.key"
JSON_SOURCE="${CERT_SOURCE%.crt}.json"

if [[ ! -f "${KEY_SOURCE}" ]]; then
  fail "Private key file not found alongside certificate: ${KEY_SOURCE}"
fi

mkdir -p "${OUTPUT_DIR}"

CERT_OUTPUT="${OUTPUT_DIR%/}/fullchain.pem"
KEY_OUTPUT="${OUTPUT_DIR%/}/privkey.pem"
JSON_OUTPUT="${OUTPUT_DIR%/}/caddy-metadata.json"
SUMMARY_OUTPUT="${OUTPUT_DIR%/}/certificate-summary.txt"

if [[ "${FORCE}" != "1" ]]; then
  [[ ! -e "${CERT_OUTPUT}" ]] || fail "Refusing to overwrite existing file: ${CERT_OUTPUT}"
  [[ ! -e "${KEY_OUTPUT}" ]] || fail "Refusing to overwrite existing file: ${KEY_OUTPUT}"
  [[ ! -e "${JSON_OUTPUT}" ]] || fail "Refusing to overwrite existing file: ${JSON_OUTPUT}"
  [[ ! -e "${SUMMARY_OUTPUT}" ]] || fail "Refusing to overwrite existing file: ${SUMMARY_OUTPUT}"
fi

umask 077

cp "${CERT_SOURCE}" "${CERT_OUTPUT}"
cp "${KEY_SOURCE}" "${KEY_OUTPUT}"

if [[ -f "${JSON_SOURCE}" ]]; then
  cp "${JSON_SOURCE}" "${JSON_OUTPUT}"
fi

if command -v openssl >/dev/null 2>&1; then
  {
    openssl x509 -in "${CERT_OUTPUT}" -noout -subject -issuer -dates
    SAN_LINE="$(
      openssl x509 -in "${CERT_OUTPUT}" -noout -text 2>/dev/null | awk '
        /Subject Alternative Name/ {
          getline
          gsub(/^[[:space:]]+/, "", $0)
          print
          exit
        }
      '
    )"
    if [[ -n "${SAN_LINE}" ]]; then
      echo "subjectAltName=${SAN_LINE}"
    fi
  } > "${SUMMARY_OUTPUT}"
fi

chmod 600 "${CERT_OUTPUT}" "${KEY_OUTPUT}"
[[ ! -f "${JSON_OUTPUT}" ]] || chmod 600 "${JSON_OUTPUT}"
[[ ! -f "${SUMMARY_OUTPUT}" ]] || chmod 600 "${SUMMARY_OUTPUT}"

echo "Exported Caddy-managed TLS material for ${DOMAIN}."
echo "Source certificate: ${CERT_SOURCE}"
echo "Certificate output: ${CERT_OUTPUT}"
echo "Key output: ${KEY_OUTPUT}"
if [[ -f "${JSON_OUTPUT}" ]]; then
  echo "Metadata output: ${JSON_OUTPUT}"
fi
if [[ -f "${SUMMARY_OUTPUT}" ]]; then
  echo "Certificate summary: ${SUMMARY_OUTPUT}"
fi
echo
echo "Next step:"
echo "  CERT_FILE=${CERT_OUTPUT} KEY_FILE=${KEY_OUTPUT} bash scripts/k8s-create-tls-secret.sh"
