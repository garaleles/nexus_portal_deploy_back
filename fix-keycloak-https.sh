#!/bin/bash

echo "🚀 Keycloak HTTPS Fix - Railway Deployment"
echo "========================================"

# Railway CLI kontrol
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI bulunamadı. Yüklemek için:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Railway login kontrol
echo "🔐 Railway login kontrol ediliyor..."
railway whoami || {
    echo "❌ Railway'e login olmanız gerekiyor:"
    echo "railway login"
    exit 1
}

echo "✅ Railway CLI authenticated"
echo ""

# 1. Backend Environment Variables Güncelle
echo "📝 Backend Environment Variables güncelleniyor..."
railway variables set --service business-portal-backend KEYCLOAK_URL="https://business-portal-keycloak-production.up.railway.app"

# 2. Keycloak Service Environment Variables Güncelle
echo "📝 Keycloak Environment Variables güncelleniyor..."
railway variables set --service business-portal-keycloak KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL="https://business-portal-keycloak-production.up.railway.app"
railway variables set --service business-portal-keycloak KC_SPI_HOSTNAME_DEFAULT_ADMIN_URL="https://business-portal-keycloak-production.up.railway.app"

# 3. Keycloak HTTPS Required ayarını güncelle
echo "📝 Keycloak HTTPS ayarları güncelleniyor..."
railway variables set --service business-portal-keycloak KC_HTTPS_REQUIRED="external_requests"

# 4. Keycloak proxy ayarları
echo "📝 Keycloak proxy ayarları güncelleniyor..."  
railway variables set --service business-portal-keycloak KC_PROXY="edge"
railway variables set --service business-portal-keycloak KC_HOSTNAME_STRICT="false"
railway variables set --service business-portal-keycloak KC_HOSTNAME_STRICT_HTTPS="false"

# 5. Restart servisler
echo "🔄 Servisler yeniden başlatılıyor..."
echo "1. Keycloak servisi yeniden başlatılıyor..."
railway restart --service business-portal-keycloak

echo "⏳ Keycloak servisinin başlaması için 60 saniye bekleniyor..."
sleep 60

echo "2. Backend servisi yeniden başlatılıyor..."  
railway restart --service business-portal-backend

echo ""
echo "✅ Deployment Fix Tamamlandı!"
echo ""
echo "🔍 Kontrol edilecek noktalar:"
echo "1. Keycloak Admin Console: https://business-portal-keycloak-production.up.railway.app/admin"
echo "2. Backend Health Check: https://business-portal-backend-production.up.railway.app/api/health"
echo "3. Backend Logs: railway logs --service business-portal-backend"
echo "4. Keycloak Logs: railway logs --service business-portal-keycloak"
echo ""
echo "🚨 Not: Eğer hala hatalar alıyorsanız:"
echo "1. Railway dashboard'dan environment variables'ları kontrol edin"
echo "2. Keycloak realm'ının doğru import edildiğini kontrol edin"
echo "3. PostgreSQL bağlantılarının çalıştığını kontrol edin" 