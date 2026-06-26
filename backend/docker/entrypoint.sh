#!/bin/sh
set -e

cd /var/www/html

# Run migrations (idempotent). Skip with SKIP_MIGRATIONS=1.
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  php artisan migrate --force --no-interaction
fi

# Optimize framework caches for production.
if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
fi

# Ensure public/storage symlink exists at runtime.
[ -L public/storage ] || php artisan storage:link || true

exec "$@"
