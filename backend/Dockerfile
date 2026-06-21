FROM php:8.2-cli

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    zip \
    libzip-dev \
    sqlite3 \
    libsqlite3-dev \
  && docker-php-ext-install pdo_sqlite zip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY backend /app

RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
RUN cp .env.example .env
RUN php artisan key:generate --force
RUN touch database/database.sqlite
RUN php artisan migrate --force

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]