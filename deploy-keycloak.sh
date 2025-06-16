#!/bin/bash

# Railway Keycloak Deployment Script
# Business Portal Keycloak Servisi

echo "🚀 Railway Keycloak Deployment Başlatılıyor..."

# Railway CLI kontrol
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI bulunamadı. Yüklemek için:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Railway'e login kontrol
echo "🔐 Railway login kontrol ediliyor..."
railway whoami || {
    echo "Railway'e login olmanız gerekiyor:"
    railway login
}

# Proje bağlantısı kontrol
echo "📋 Railway proje bağlantısı kontrol ediliyor..."
railway status || {
    echo "Railway projesine bağlanmak için:"
    echo "railway link"
    exit 1
}

# Keycloak servisi oluştur
echo "🔧 Keycloak servisi oluşturuluyor..."

# Environment variables ayarla
echo "⚙️ Environment variables ayarlanıyor..."

# Kritik environment variables
railway variables set KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
railway variables set KC_DB_URL='jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}'
railway variables set KC_DB_USERNAME='${{Postgres.PGUSER}}'
railway variables set KC_DB_PASSWORD='${{Postgres.PGPASSWORD}}'

# Diğer ayarlar
railway variables set KC_PROXY=edge
railway variables set KC_HOSTNAME_STRICT=false
railway variables set KC_HOSTNAME_STRICT_HTTPS=false
railway variables set KC_HTTP_ENABLED=true
railway variables set KC_DB=postgres
railway variables set KC_HEALTH_ENABLED=true
railway variables set KC_METRICS_ENABLED=true
railway variables set KC_LOG_LEVEL=INFO
railway variables set KC_FEATURES=preview,scripts,organization
railway variables set PORT=8080
railway variables set JAVA_OPTS="-Xms256m -Xmx768m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m"

# Deploy et
echo "🚀 Keycloak deploy ediliyor..."
railway up --detach

echo "✅ Deployment başlatıldı!"
echo "📊 Status'u kontrol etmek için: railway status"
echo "📋 Logs'u görmek için: railway logs"
echo "🌐 Admin panel: https://<your-service-url>/admin"
echo "📝 Admin kullanıcı: admin"
echo "🔑 Admin şifre: railway variables get KEYCLOAK_ADMIN_PASSWORD"

echo "⚠️  Önemli Notlar:"
echo "1. PostgreSQL servisi çalışır durumda olmalı"
echo "2. İlk başlatma 2-3 dakika sürebilir (realm import)"
echo "3. Health check endpoint: /health/ready" 