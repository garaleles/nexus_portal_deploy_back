#!/bin/bash

echo "🚀 Keycloak startup script başlatılıyor..."

# Database bağlantısını bekle
echo "⏳ Database bağlantısı kontrol ediliyor..."
until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER; do
  echo "⏳ PostgreSQL henüz hazır değil, bekleniyor..."
  sleep 2
done

echo "✅ PostgreSQL hazır!"

# Keycloak'u başlat
echo "🔐 Keycloak başlatılıyor..."
/opt/keycloak/bin/kc.sh start --optimized --import-realm 