#!/bin/bash

echo "🚀 Railway Keycloak SSL ve Authentication Sorunları Düzeltme Scripti"
echo "================================================================="

# Railway CLI kontrol
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI bulunamadı. Yüklemek için:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Railway login kontrol
echo "🔐 Railway login kontrol ediliyor..."
railway whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Railway'e login olmanız gerekiyor:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI authenticated"
echo ""

# Mevcut proje kontrol
echo "📋 Railway proje bağlantısı kontrol ediliyor..."
railway status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Railway projesine bağlanmanız gerekiyor:"
    echo "railway link"
    exit 1
fi

echo "✅ Railway projesine bağlı"
echo ""

# 1. Environment Variables güncelle
echo "📝 1. Environment Variables güncelleniyor..."

# Backend service için URL'leri güncelle
echo "   📍 Backend service - Keycloak URL'leri güncelleniyor..."
railway variables --set "KEYCLOAK_URL=http://keycloack.railway.internal:8080" --service backend
railway variables --set "KEYCLOAK_PUBLIC_URL=https://keycloack-production.up.railway.app" --service backend

# 2. Keycloak Service ayarlarını güncelle 
echo "   📍 Keycloak service ayarları güncelleniyor..."

# Keycloak SSL ayarları
railway variables --set "KC_HOSTNAME_STRICT=false" --service keycloack
railway variables --set "KC_HOSTNAME_STRICT_HTTPS=false" --service keycloack
railway variables --set "KC_HTTP_ENABLED=true" --service keycloack
railway variables --set "KC_HTTPS_REQUIRED=none" --service keycloack
railway variables --set "KC_SSL_REQUIRED=none" --service keycloack
railway variables --set "KC_HOSTNAME_VERIFICATION=false" --service keycloack

# Proxy ayarları (Railway için)
railway variables --set "KC_PROXY=edge" --service keycloack
railway variables --set "KC_SPI_TRUSTSTORE_FILE_DISABLED=true" --service keycloack
railway variables --set "KC_SPI_CONNECTIONS_HTTP_CLIENT_DEFAULT_DISABLE_TRUST_MANAGER=true" --service keycloack

# Internal URL'leri güncelle 
railway variables --set "KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL=http://keycloack.railway.internal:8080" --service keycloack
railway variables --set "KC_SPI_HOSTNAME_DEFAULT_ADMIN_URL=http://keycloack.railway.internal:8080" --service keycloack

# 3. Railway environment marker ekle
echo "   📍 Railway environment marker ekleniyor..."
railway variables --set "RAILWAY_ENVIRONMENT=production" --service backend

# 4. SSL bypass marker güncelle
railway variables --set "SSL_BYPASS_ENHANCED=railway-optimized" --service backend

echo "✅ Environment variables güncellendi"
echo ""

# 5. Servisler yeniden başlat
echo "🔄 2. Servisler yeniden başlatılıyor..."

echo "   🔄 Keycloak servisi yeniden başlatılıyor..."
railway redeploy --service keycloack

echo "   ⏳ Keycloak servisinin başlaması için 90 saniye bekleniyor..."
sleep 90

echo "   🔄 Backend servisi yeniden başlatılıyor..."
railway redeploy --service backend

echo "   ⏳ Backend servisinin başlaması için 30 saniye bekleniyor..."
sleep 30

echo ""
echo "✅ Railway Keycloak Düzeltmeleri Tamamlandı!"
echo ""
echo "🔍 Kontrol Edilecek Noktalar:"
echo "=============================="
echo "1. 🌐 Keycloak Admin Console: https://keycloack-production.up.railway.app/admin"
echo "2. 🔍 Backend Health Check: https://business-portal-backend-production.up.railway.app/api/health"
echo "3. 📊 Backend Logs: railway logs --service backend"
echo "4. 🔧 Keycloak Logs: railway logs --service keycloack"
echo ""
echo "🎯 Beklenen Sonuçlar:"
echo "====================="
echo "✅ DNS çözümleme hataları düzelmeli (EAI_AGAIN)"
echo "✅ SSL ayarları otomatik olarak düzelmeli"
echo "✅ Keycloak authentication başarılı olmalı"
echo "✅ 'invalid_request' hataları kaybolmalı"
echo ""
echo "🚨 Hala Sorun Varsa:"
echo "==================="
echo "1. Railway dashboard'dan URL'lerin doğru olduğunu kontrol edin"
echo "2. Keycloak ve Backend servislerin çalıştığını doğrulayın"
echo "3. Network bağlantısını test edin: curl https://keycloack-production.up.railway.app/health"
echo "4. Bu scripti tekrar çalıştırın"
echo ""
echo "📞 Support: Gerekirse Railway support'a başvurun" 