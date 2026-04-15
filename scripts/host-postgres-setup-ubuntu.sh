#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Prepare host-native PostgreSQL for the first-cut same-host K3s deployment on Ubuntu.
#
# Safe default:
# - APPLY=0 prints the actions without changing the machine
# - APPLY=1 performs the changes

set -euo pipefail

APPLY="${APPLY:-0}"
POSTGRES_VERSION="${POSTGRES_VERSION:-16}"
DB_NAME="${DB_NAME:-tcrn_tms}"
DB_USER="${DB_USER:-tcrn}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_PORT="${DB_PORT:-5432}"
ALLOW_CIDR="${ALLOW_CIDR:-10.42.0.0/16}"
LISTEN_ADDRESSES="${LISTEN_ADDRESSES:-*}"
PG_CONF_DIR="${PG_CONF_DIR:-/etc/postgresql/${POSTGRES_VERSION}/main}"
PG_HBA_FILE="${PG_HBA_FILE:-${PG_CONF_DIR}/pg_hba.conf}"
PG_CONF_FILE="${PG_CONF_FILE:-${PG_CONF_DIR}/postgresql.conf}"
PG_SERVICE_NAME="${PG_SERVICE_NAME:-postgresql}"
HBA_MARKER_BEGIN="# tcrn-k3s-first-cut begin"
HBA_MARKER_END="# tcrn-k3s-first-cut end"

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "Set DB_PASSWORD before running."
  exit 1
fi

if [[ ! -f /etc/os-release ]] || ! grep -qi "ubuntu" /etc/os-release; then
  echo "This helper currently targets Ubuntu hosts only."
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get is required."
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

run_cmd() {
  echo "+ $*"
  if [[ "${APPLY}" == "1" ]]; then
    "$@"
  fi
}

run_shell() {
  echo "+ $*"
  if [[ "${APPLY}" == "1" ]]; then
    bash -lc "$*"
  fi
}

echo "Host-native PostgreSQL setup for first-cut K3s"
echo "APPLY=${APPLY}"
echo "POSTGRES_VERSION=${POSTGRES_VERSION}"
echo "DB_NAME=${DB_NAME}"
echo "DB_USER=${DB_USER}"
echo "DB_PORT=${DB_PORT}"
echo "ALLOW_CIDR=${ALLOW_CIDR}"
echo "LISTEN_ADDRESSES=${LISTEN_ADDRESSES}"

run_cmd apt-get update
run_cmd apt-get install -y "postgresql-${POSTGRES_VERSION}" "postgresql-client-${POSTGRES_VERSION}"
run_cmd systemctl enable "${PG_SERVICE_NAME}"

run_shell "sed -i -E \"s|^[#[:space:]]*listen_addresses[[:space:]]*=.*|listen_addresses = '${LISTEN_ADDRESSES}'|\" '${PG_CONF_FILE}'"

HBA_RULE="host    ${DB_NAME}    ${DB_USER}    ${ALLOW_CIDR}    scram-sha-256"

run_shell "python3 - <<'PY'
from pathlib import Path

path = Path('${PG_HBA_FILE}')
text = path.read_text()
begin = '${HBA_MARKER_BEGIN}'
end = '${HBA_MARKER_END}'
block = begin + '\n${HBA_RULE}\n' + end + '\n'

if begin in text and end in text:
    before, rest = text.split(begin, 1)
    _, after = rest.split(end, 1)
    path.write_text(before.rstrip() + '\n' + block + after.lstrip())
else:
    path.write_text(text.rstrip() + '\n\n' + block)
PY"

run_cmd systemctl restart "${PG_SERVICE_NAME}"

run_shell "sudo -u postgres psql -v ON_ERROR_STOP=1 -c \"DO \\\$\\\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}'; ELSE ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}'; END IF; END \\\$\\\$;\""
run_shell "sudo -u postgres psql -v ON_ERROR_STOP=1 -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || sudo -u postgres createdb -O '${DB_USER}' '${DB_NAME}'"

echo "Done."
echo "Recommended next checks:"
echo "  bash scripts/host-postgres-preflight.sh"
echo "  sudo -u postgres psql -d '${DB_NAME}' -c '\\conninfo'"
echo "  ss -ltnp | grep ':${DB_PORT}'"
echo ""
echo "Use a host IP or DNS name reachable from K3s pods in DATABASE_URL."
echo "Do not point K3s pods at localhost for the same-host external PostgreSQL path."
