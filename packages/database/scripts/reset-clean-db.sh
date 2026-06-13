#!/bin/bash
# SPDX-License-Identifier: Apache-2.0
# Clean Database Reset Script
# This script resets the database to a clean state with only AC tenant and system data.

set -e

echo "🗑️  TCRN-TMS Clean Database Reset"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA in your local database!"
echo "    Only AC tenant and system configuration will remain."
echo ""

# Check for --force flag
if [[ "$1" != "--force" ]]; then
  read -p "Are you sure you want to continue? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "📌 Step 1: Stopping running services..."
# Check if dev server is running and suggest stopping it
if pgrep -f "pnpm dev" > /dev/null 2>&1; then
  echo "   ⚠️  Dev server is running. Please stop it first (Ctrl+C in the terminal)."
  if [[ "$1" != "--force" ]]; then
    exit 1
  fi
fi

echo "📌 Step 2: Resetting database with Prisma..."
cd "$(dirname "$0")/.."

# Run Prisma migrate reset with force
pnpm prisma migrate reset --force

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📋 Current state:"
echo "   - AC tenant created"
echo "   - AC admin user: ac_admin (password set in seed file)"
echo "   - System roles and resources seeded"
echo "   - No test tenants or mock data"
echo ""
echo "ℹ️  To create a new tenant, log in as AC admin and use the tenant management page."
