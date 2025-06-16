#!/bin/bash

echo "🚀 Keycloak startup script başlatılıyor..."

# Database bağlantısını bekle
echo "⏳ Database bağlantısı kontrol ediliyor..."
echo "🔍 DB Host: $DATABASE_HOST"
echo "🔍 DB Port: $DATABASE_PORT"
echo "🔍 DB User: $DATABASE_USER"

# Railway PostgreSQL variables kullan
until pg_isready -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER; do
  echo "⏳ PostgreSQL henüz hazır değil, bekleniyor..."
  sleep 2
done

echo "✅ PostgreSQL hazır!"

# Keycloak'u başlat
echo "🔐 Keycloak başlatılıyor..."
/opt/keycloak/bin/kc.sh start --optimized --import-realm \
  --spi-truststore-file-disabled=true \
  --spi-connections-http-client-default-disable-trust-manager=true 