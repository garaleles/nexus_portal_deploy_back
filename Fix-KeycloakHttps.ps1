# Keycloak HTTPS Fix - Railway Deployment PowerShell Script
# Windows PowerShell için

Write-Host "🚀 Keycloak HTTPS Fix - Railway Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Railway CLI kontrol
$railwayCommand = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayCommand) {
    Write-Host "❌ Railway CLI bulunamadı. Yüklemek için:" -ForegroundColor Red
    Write-Host "npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Railway login kontrol
Write-Host "🔐 Railway login kontrol ediliyor..." -ForegroundColor Blue
$loginCheck = railway whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Railway'e login olmanız gerekiyor:" -ForegroundColor Red
    Write-Host "railway login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Railway CLI authenticated" -ForegroundColor Green
Write-Host ""

# 1. Backend Environment Variables Güncelle
Write-Host "📝 Backend Environment Variables güncelleniyor..." -ForegroundColor Blue
railway variables set --service business-portal-backend KEYCLOAK_URL="https://business-portal-keycloak-production.up.railway.app"

# 2. Keycloak Service Environment Variables Güncelle
Write-Host "📝 Keycloak Environment Variables güncelleniyor..." -ForegroundColor Blue
railway variables set --service business-portal-keycloak KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL="https://business-portal-keycloak-production.up.railway.app"
railway variables set --service business-portal-keycloak KC_SPI_HOSTNAME_DEFAULT_ADMIN_URL="https://business-portal-keycloak-production.up.railway.app"

# 3. Keycloak HTTPS Required ayarını güncelle
Write-Host "📝 Keycloak HTTPS ayarları güncelleniyor..." -ForegroundColor Blue
railway variables set --service business-portal-keycloak KC_HTTPS_REQUIRED="external_requests"

# 4. Keycloak proxy ayarları
Write-Host "📝 Keycloak proxy ayarları güncelleniyor..." -ForegroundColor Blue
railway variables set --service business-portal-keycloak KC_PROXY="edge"
railway variables set --service business-portal-keycloak KC_HOSTNAME_STRICT="false"
railway variables set --service business-portal-keycloak KC_HOSTNAME_STRICT_HTTPS="false"

# 5. Restart servisler
Write-Host "🔄 Servisler yeniden başlatılıyor..." -ForegroundColor Blue
Write-Host "1. Keycloak servisi yeniden başlatılıyor..." -ForegroundColor Yellow
railway restart --service business-portal-keycloak

Write-Host "⏳ Keycloak servisinin başlaması için 60 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host "2. Backend servisi yeniden başlatılıyor..." -ForegroundColor Yellow
railway restart --service business-portal-backend

Write-Host ""
Write-Host "✅ Deployment Fix Tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Kontrol edilecek noktalar:" -ForegroundColor Cyan
Write-Host "1. Keycloak Admin Console: https://business-portal-keycloak-production.up.railway.app/admin" -ForegroundColor White
Write-Host "2. Backend Health Check: https://business-portal-backend-production.up.railway.app/api/health" -ForegroundColor White
Write-Host "3. Backend Logs: railway logs --service business-portal-backend" -ForegroundColor White
Write-Host "4. Keycloak Logs: railway logs --service business-portal-keycloak" -ForegroundColor White
Write-Host ""
Write-Host "🚨 Not: Eğer hala hatalar alıyorsanız:" -ForegroundColor Red
Write-Host "1. Railway dashboard'dan environment variables'ları kontrol edin" -ForegroundColor White
Write-Host "2. Keycloak realm'ının doğru import edildiğini kontrol edin" -ForegroundColor White
Write-Host "3. PostgreSQL bağlantılarının çalıştığını kontrol edin" -ForegroundColor White 