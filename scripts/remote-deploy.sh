#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS Remote Deployment Script
# Run this script on the production server

set -e

DEPLOY_PATH="/home/ubuntu/tcrn-tms"
GITHUB_REPO="https://github.com/tpmoonchefryan/TCRN-TMS.git"

echo "=============================================="
echo "TCRN TMS Production Deployment"
echo "=============================================="

# Step 1: Install prerequisites
echo ""
echo "[1/7] Checking prerequisites..."

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
echo "[2/7] Syncing repository..."

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
echo "[3/7] Checking environment configuration..."

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
echo "[4/7] Setting up directories..."
sudo mkdir -p /var/log/caddy
sudo chown -R 1000:1000 /var/log/caddy 2>/dev/null || true

# Step 5: Build Docker images
echo ""
echo "[5/7] Building Docker images (this may take 10-20 minutes)..."
cd ${DEPLOY_PATH}
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --parallel

# Step 6: Start services
echo ""
echo "[6/7] Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Step 7: Wait and check status
echo ""
echo "[7/7] Waiting for services to start..."
sleep 30

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
echo "  2. Run database migrations (if needed)"
echo "  3. Run database seed (if first deployment)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f [service]"
echo "  - Restart:   docker compose restart [service]"
echo "  - Stop all:  docker compose down"
echo "  - Rebuild:   docker compose build --no-cache [service]"
