#!/bin/bash
#
# deploy.sh - Backend deployment script for Wear Impressive
#
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "============================================"
echo " Deploying Wear Impressive Backend"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# Install PHP dependencies
echo ""
echo "[1/4] Installing Composer dependencies..."
composer install --no-dev --no-interaction --optimize-autoloader --prefer-dist

# Run migrations
echo ""
echo "[2/4] Running database migrations..."
php artisan migrate --force

# Cache configuration
echo ""
echo "[3/4] Caching configuration..."
php artisan config:cache
php artisan route:cache

# Fix permissions
echo ""
echo "[4/4] Fixing permissions..."
mkdir -p bootstrap/cache
chown -R www-data:www-data bootstrap/cache storage

echo ""
echo "============================================"
echo " Backend deployment complete!"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
