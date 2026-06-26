# syntax=docker/dockerfile:1.6
# eTommerce Backend — PHP 8.2 + FPM + Nginx

FROM php:8.2-fpm-alpine AS base

RUN apk add --no-cache \
        git curl zip unzip icu-dev libzip-dev libpng-dev oniguruma-dev \
        libxml2-dev sqlite-dev autoconf g++ make nginx supervisor bash \
    && docker-php-ext-install pdo pdo_mysql pdo_sqlite mbstring bcmath \
       zip intl pcntl exif gd \
    && pecl install redis && docker-php-ext-enable redis \
    && apk del autoconf g++ make

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Dependencies (layer cacheable) ──────────────────────────────────────────
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist \
    && composer clear-cache

# ── Application source ──────────────────────────────────────────────────────
COPY . .
RUN composer dump-autoload -o --no-dev \
    && mkdir -p storage/framework/{sessions,views,cache,testing} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# ── Nginx + PHP-FPM + Supervisor ────────────────────────────────────────────
COPY docker/nginx.conf        /etc/nginx/nginx.conf
COPY docker/php-fpm.conf      /usr/local/etc/php-fpm.d/zz-etommerce.conf
COPY docker/supervisord.conf  /etc/supervisord.conf
COPY docker/entrypoint.sh     /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
