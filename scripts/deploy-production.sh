#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS Production Deployment Script

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

# Configuration
DEPLOY_USER="ubuntu"
DEPLOY_HOST="43.153.195.213"
DEPLOY_PATH="/home/ubuntu/tcrn-tms"
GITHUB_REPO="https://github.com/tpmoonchefryan/TCRN-TMS.git"

echo "=============================================="
echo "TCRN TMS Production Deployment"
echo "Target: ${DEPLOY_USER}@${DEPLOY_HOST}"
echo "=============================================="

# Function to run commands on remote server
run_remote() {
    ssh ${DEPLOY_USER}@${DEPLOY_HOST} "$1"
}

# Step 1: Check prerequisites on remote server
echo ""
echo "[1/6] Checking server prerequisites..."
run_remote "
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo 'Installing Docker...'
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker \$USER
        echo 'Docker installed. Please log out and log back in, then re-run this script.'
        exit 1
    fi

    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null; then
        echo 'Docker Compose plugin not found, installing...'
        sudo apt-get update
        sudo apt-get install -y docker-compose-plugin
    fi

    echo 'Docker version:' && docker --version
    echo 'Docker Compose version:' && docker compose version
"

# Step 2: Clone or update repository
echo ""
echo "[2/6] Syncing repository..."
run_remote "
    if [ -d '${DEPLOY_PATH}' ]; then
        cd ${DEPLOY_PATH}
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    else
        git clone ${GITHUB_REPO} ${DEPLOY_PATH}
        cd ${DEPLOY_PATH}
    fi
    echo 'Current commit:' && git log --oneline -1
"

# Step 3: Setup environment file
echo ""
echo "[3/6] Setting up environment..."
echo "You need to create/update the .env file on the server."
echo "Opening SSH session for manual .env configuration..."
echo ""
echo "Please run the following commands on the server:"
echo "  cd ${DEPLOY_PATH}"
echo "  nano .env"
echo ""
echo "Required environment variables:"
cat << 'ENVLIST'
# Database
POSTGRES_USER=tcrn
POSTGRES_PASSWORD=<your-secure-password>
POSTGRES_DB=tcrn_tms

# Redis
REDIS_PASSWORD=<your-secure-password>

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<your-secure-password>

# JWT Secrets (must be at least 32 characters)
JWT_SECRET=<your-32-char-secret>
JWT_REFRESH_SECRET=<your-32-char-secret>
FINGERPRINT_SECRET_KEY=<your-secret-key>

# Public URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# Email (Tencent SES)
TENCENT_SES_SECRET_ID=<your-secret-id>
TENCENT_SES_SECRET_KEY=<your-secret-key>
TENCENT_SES_FROM_ADDRESS=noreply@yourdomain.com
ENVLIST
echo ""
read -p "Press Enter after you have configured .env on the server..."

# Step 4: Build Docker images
echo ""
echo "[4/6] Building Docker images (this may take a while)..."
if [[ "${#BUILD_ARGS[@]}" -gt 0 ]]; then
    echo "Build mode: clean (--no-cache)"
else
    echo "Build mode: cached"
fi
run_remote "
    cd ${DEPLOY_PATH}
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build ${BUILD_ARGS[*]} web api worker
"

# Step 5: Start services
echo ""
echo "[5/6] Starting services..."
run_remote "
    cd ${DEPLOY_PATH}
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
"

# Step 6: Run database migrations
echo ""
echo "[6/6] Running database migrations..."
echo "Tenant migration replay mode: ${APPLY_MIGRATIONS_MODE}"
run_remote "
    cd ${DEPLOY_PATH}
    # Wait for postgres to be ready
    sleep 10
    APPLY_MIGRATIONS_MODE='${APPLY_MIGRATIONS_MODE}'
    ROLLOUT_MIGRATIONS='${ROLLOUT_MIGRATIONS}'
    APPLY_MIGRATIONS_CMD='npx tsx scripts/apply-migrations.ts'
    case \"\$APPLY_MIGRATIONS_MODE\" in
        strict_drift_watch)
            echo 'Using strict drift-watch mode for tenant migration replay.'
            APPLY_MIGRATIONS_CMD=\"\$APPLY_MIGRATIONS_CMD --fail-on-drift-watch-skips\"
            ;;
        *)
            echo 'Using default tenant migration replay mode.'
            ;;
    esac
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api sh -lc \"cd /app/packages/database && npx prisma migrate deploy && \$APPLY_MIGRATIONS_CMD\"
    if [ -n \"\$ROLLOUT_MIGRATIONS\" ]; then
        echo \"Running schema rollout verification for migrations: \$ROLLOUT_MIGRATIONS\"
        VERIFY_ARGS='--infer-artifacts-from-migrations --json'
        IFS=',' read -r -a ROLLOUT_MIGRATION_ARRAY <<< \"\$ROLLOUT_MIGRATIONS\"
        for migration in \"\${ROLLOUT_MIGRATION_ARRAY[@]}\"; do
            if [ -n \"\$migration\" ]; then
                VERIFY_ARGS=\"\$VERIFY_ARGS --migration \$migration\"
            fi
        done
        docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api sh -lc \"cd /app/packages/database && npx tsx scripts/verify-schema-rollout.ts \$VERIFY_ARGS\"
    else
        echo 'No ROLLOUT_MIGRATIONS supplied; skipping schema rollout verification.'
    fi
"

# Final status
echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
run_remote "
    cd ${DEPLOY_PATH}
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
"

echo ""
echo "Services should be available at:"
echo "  - Web:  http://${DEPLOY_HOST}:3000"
echo "  - API:  http://${DEPLOY_HOST}:4000"
echo "  - MinIO Console: http://${DEPLOY_HOST}:9001"
echo ""
echo "Next steps:"
echo "  1. Configure reverse proxy (Caddy/Nginx) for HTTPS"
echo "  2. Run database seed: docker compose exec api pnpm db:seed"
echo "  3. Configure DNS for your domain"
echo "  4. Optional strict drift-watch replay: APPLY_MIGRATIONS_MODE=strict_drift_watch ./scripts/deploy-production.sh"
echo "  5. Optional rollout verification: ROLLOUT_MIGRATIONS=<migration_a,migration_b> ./scripts/deploy-production.sh"
