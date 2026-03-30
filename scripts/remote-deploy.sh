#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS Remote Deployment Script
# Run this script on the production server

set -e

BUILD_ARGS=()
if [[ "${NO_CACHE_BUILD:-0}" == "1" ]]; then
    BUILD_ARGS+=(--no-cache)
fi

APPLY_MIGRATIONS_MODE="${APPLY_MIGRATIONS_MODE:-default}"
case "$APPLY_MIGRATIONS_MODE" in
    default|strict_drift_watch)
        ;;
    *)
        echo "Unsupported APPLY_MIGRATIONS_MODE: $APPLY_MIGRATIONS_MODE" >&2
        echo "Supported values: default, strict_drift_watch" >&2
        exit 1
        ;;
esac

normalize_rollout_migrations() {
    printf '%s' "$1" | tr ',[:space:]' '\n' | sed '/^$/d' | sort -u | paste -sd ',' -
}

ROLLOUT_MIGRATIONS="${ROLLOUT_MIGRATIONS:-}"
ROLLOUT_MIGRATIONS="$(normalize_rollout_migrations "$ROLLOUT_MIGRATIONS")"

DEPLOY_PATH="/home/ubuntu/tcrn-tms"
GITHUB_REPO="https://github.com/tpmoonchefryan/TCRN-TMS.git"

echo "=============================================="
echo "TCRN TMS Production Deployment"
echo "=============================================="

# Step 1: Install prerequisites
echo ""
echo "[1/8] Checking prerequisites..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo ""
    echo "Docker installed! Please run: newgrp docker"
    echo "Then re-run this script."
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo "Git: $(git --version)"

# Step 2: Clone or update repository
echo ""
echo "[2/8] Syncing repository..."

if [ -d "${DEPLOY_PATH}" ]; then
    cd ${DEPLOY_PATH}
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    git clone ${GITHUB_REPO} ${DEPLOY_PATH}
    cd ${DEPLOY_PATH}
fi

echo "Current commit: $(git log --oneline -1)"

# Step 3: Setup environment file
echo ""
echo "[3/8] Checking environment configuration..."

if [ ! -f "${DEPLOY_PATH}/.env" ]; then
    echo ""
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create the .env file first:"
    echo "  cp .env.production.example .env"
    echo "  nano .env"
    echo ""
    echo "Fill in all required values, then re-run this script."
    exit 1
fi

echo ".env file found."

# Step 4: Create log directory for Caddy
echo ""
echo "[4/8] Setting up directories..."
sudo mkdir -p /var/log/caddy
sudo chown -R 1000:1000 /var/log/caddy 2>/dev/null || true

# Step 5: Build Docker images
echo ""
echo "[5/8] Building Docker images (this may take 10-20 minutes)..."
if [[ "${#BUILD_ARGS[@]}" -gt 0 ]]; then
    echo "Build mode: clean (--no-cache)"
else
    echo "Build mode: cached"
fi
cd ${DEPLOY_PATH}
docker compose -f docker-compose.yml -f docker-compose.prod.yml build "${BUILD_ARGS[@]}" --parallel web api worker

# Step 6: Start services
echo ""
echo "[6/8] Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Step 7: Run database migrations
echo ""
echo "[7/8] Running database migrations..."
echo "Tenant migration replay mode: ${APPLY_MIGRATIONS_MODE}"
sleep 10
APPLY_MIGRATIONS_CMD="npx tsx scripts/apply-migrations.ts"
case "$APPLY_MIGRATIONS_MODE" in
    strict_drift_watch)
        echo "Using strict drift-watch mode for tenant migration replay."
        APPLY_MIGRATIONS_CMD="$APPLY_MIGRATIONS_CMD --fail-on-drift-watch-skips"
        ;;
    *)
        echo "Using default tenant migration replay mode."
        ;;
esac
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api sh -lc "cd /app/packages/database && npx prisma migrate deploy && $APPLY_MIGRATIONS_CMD"
if [[ -n "$ROLLOUT_MIGRATIONS" ]]; then
    echo "Running schema rollout verification for migrations: ${ROLLOUT_MIGRATIONS}"
    VERIFY_ARGS=(--infer-artifacts-from-migrations --json)
    IFS=',' read -r -a ROLLOUT_MIGRATION_ARRAY <<< "$ROLLOUT_MIGRATIONS"
    for migration in "${ROLLOUT_MIGRATION_ARRAY[@]}"; do
        if [[ -n "$migration" ]]; then
            VERIFY_ARGS+=(--migration "$migration")
        fi
    done
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api sh -lc "cd /app/packages/database && npx tsx scripts/verify-schema-rollout.ts ${VERIFY_ARGS[*]}"
else
    echo "No ROLLOUT_MIGRATIONS supplied; skipping schema rollout verification."
fi

# Step 8: Wait and check status
echo ""
echo "[8/8] Waiting for services to stabilize..."
sleep 20

echo ""
echo "=============================================="
echo "Service Status"
echo "=============================================="
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check if Caddy got the certificate
echo ""
echo "Checking HTTPS certificate..."
sleep 5
curl -sI https://web.prod.tcrn-tms.com 2>/dev/null | head -5 || echo "Certificate may still be provisioning..."

echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
echo ""
echo "Your application is available at:"
echo "  https://web.prod.tcrn-tms.com"
echo ""
echo "Next steps:"
echo "  1. Check logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  2. Review the migration output above if tenant replay reported skips or errors"
echo "  3. Run database seed (if first deployment)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f [service]"
echo "  - Restart:   docker compose restart [service]"
echo "  - Stop all:  docker compose down"
echo "  - Force clean script rebuild: NO_CACHE_BUILD=1 ./scripts/remote-deploy.sh"
echo "  - Strict drift-watch replay: APPLY_MIGRATIONS_MODE=strict_drift_watch ./scripts/remote-deploy.sh"
echo "  - Rollout verification: ROLLOUT_MIGRATIONS=<migration_a,migration_b> ./scripts/remote-deploy.sh"
