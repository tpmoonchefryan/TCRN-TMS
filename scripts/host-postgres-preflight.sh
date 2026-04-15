#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Read-only preflight checks for the first-cut same-host PostgreSQL path.

set -euo pipefail

POSTGRES_VERSION="${POSTGRES_VERSION:-16}"
DB_NAME="${DB_NAME:-tcrn_tms}"
DB_USER="${DB_USER:-tcrn}"
ALLOW_CIDR="${ALLOW_CIDR:-10.42.0.0/16}"
PG_CONF_DIR="${PG_CONF_DIR:-/etc/postgresql/${POSTGRES_VERSION}/main}"
PG_SERVICE_NAME="${PG_SERVICE_NAME:-postgresql}"

echo "== Host OS =="
grep '^PRETTY_NAME=' /etc/os-release 2>/dev/null || true

echo "== Package manager =="
command -v apt-get || true

echo "== PostgreSQL packages =="
dpkg -l | grep -E "^ii[[:space:]]+postgresql(-${POSTGRES_VERSION})?|^ii[[:space:]]+postgresql-client(-${POSTGRES_VERSION})?" || true

echo "== PostgreSQL service =="
if command -v systemctl >/dev/null 2>&1; then
  systemctl is-active "${PG_SERVICE_NAME}" 2>/dev/null || true
  systemctl is-enabled "${PG_SERVICE_NAME}" 2>/dev/null || true
else
  echo "systemctl not available"
fi

echo "== PostgreSQL config files =="
ls -l "${PG_CONF_DIR}/postgresql.conf" "${PG_CONF_DIR}/pg_hba.conf" 2>/dev/null || true

echo "== listen_addresses =="
grep -n "^[[:space:]]*listen_addresses" "${PG_CONF_DIR}/postgresql.conf" 2>/dev/null || true

echo "== TCRN pg_hba rules =="
grep -n "tcrn-k3s-first-cut\|${ALLOW_CIDR}\|${DB_NAME}[[:space:]]\+${DB_USER}" "${PG_CONF_DIR}/pg_hba.conf" 2>/dev/null || true

echo "== PostgreSQL roles/databases =="
if command -v sudo >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
  sudo -u postgres psql -tAc "SELECT rolname FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || true
  sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true
else
  echo "sudo or psql not available"
fi

echo "== Network listeners =="
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep ':5432' || true
else
  echo "ss not available"
fi

echo "== Firewall =="
if command -v ufw >/dev/null 2>&1; then
  ufw status 2>/dev/null || true
else
  echo "ufw not available"
fi

echo "Preflight checks completed."
