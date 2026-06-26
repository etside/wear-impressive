#!/bin/bash
#
# deploy.sh - Frontend deployment script for Wear Impressive
#
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "============================================"
echo " Deploying Wear Impressive Frontend"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# Install dependencies
echo ""
echo "[1/3] Installing dependencies..."
npm ci --no-audit --no-fund

# Build
echo ""
echo "[2/3] Building..."
NEXT_PUBLIC_API_URL=https://api.v2.wearimpressive.com/api npm run build

# Restart PM2
echo ""
echo "[3/3] Restarting PM2..."
pm2 restart wearimpressive-storefront && pm2 save

echo ""
echo "============================================"
echo " Frontend deployment complete!"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
