# Railway Keycloak SSL ve Authentication Sorunlari Duzeltme Scripti - PowerShell
# Windows PowerShell icin

Write-Host "Railway Keycloak SSL ve Authentication Sorunlari Duzeltme Scripti" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

# Railway CLI kontrol
$railwayCommand = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayCommand) {
    Write-Host "Railway CLI bulunamadi. Yuklemek icin:" -ForegroundColor Red
    Write-Host "npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Railway login kontrol
Write-Host "Railway login kontrol ediliyor..." -ForegroundColor Blue
$loginCheck = railway whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Railway'e login olmaniz gerekiyor:" -ForegroundColor Red
    Write-Host "railway login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Railway CLI authenticated" -ForegroundColor Green
Write-Host ""

# Mevcut proje kontrol
Write-Host "Railway proje baglantisi kontrol ediliyor..." -ForegroundColor Blue
$statusCheck = railway status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Railway projesine baglanmaniz gerekiyor:" -ForegroundColor Red
    Write-Host "railway link" -ForegroundColor Yellow
    exit 1
}

Write-Host "Railway projesine bagli" -ForegroundColor Green
Write-Host ""

# 1. Environment Variables guncelle
Write-Host "1. Environment Variables guncelleniyor..." -ForegroundColor Blue

# Backend service icin URL'leri guncelle
Write-Host "   Backend service - Keycloak URL'leri guncelleniyor..." -ForegroundColor Yellow
railway variables --set "KEYCLOAK_URL=http://keycloack.railway.internal:8080" --service backend
railway variables --set "KEYCLOAK_PUBLIC_URL=https://keycloack-production.up.railway.app" --service backend

# 2. Keycloak Service ayarlarini guncelle 
Write-Host "   Keycloak service ayarlari guncelleniyor..." -ForegroundColor Yellow

# Keycloak SSL ayarlari
railway variables --set "KC_HOSTNAME_STRICT=false" --service keycloack
railway variables --set "KC_HOSTNAME_STRICT_HTTPS=false" --service keycloack
railway variables --set "KC_HTTP_ENABLED=true" --service keycloack
railway variables --set "KC_HTTPS_REQUIRED=none" --service keycloack
railway variables --set "KC_SSL_REQUIRED=none" --service keycloack
railway variables --set "KC_HOSTNAME_VERIFICATION=false" --service keycloack

# Proxy ayarlari (Railway icin)
railway variables --set "KC_PROXY=edge" --service keycloack
railway variables --set "KC_SPI_TRUSTSTORE_FILE_DISABLED=true" --service keycloack
railway variables --set "KC_SPI_CONNECTIONS_HTTP_CLIENT_DEFAULT_DISABLE_TRUST_MANAGER=true" --service keycloack

# Internal URL'leri guncelle 
railway variables --set "KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL=http://keycloack.railway.internal:8080" --service keycloack
railway variables --set "KC_SPI_HOSTNAME_DEFAULT_ADMIN_URL=http://keycloack.railway.internal:8080" --service keycloack

# 3. Railway environment marker ekle
Write-Host "   Railway environment marker ekleniyor..." -ForegroundColor Yellow
railway variables --set "RAILWAY_ENVIRONMENT=production" --service backend

# 4. SSL bypass marker guncelle
railway variables --set "SSL_BYPASS_ENHANCED=railway-optimized" --service backend

Write-Host "Environment variables guncellendi" -ForegroundColor Green
Write-Host ""

# 5. Servisler yeniden baslat
Write-Host "2. Servisler yeniden baslatiliyor..." -ForegroundColor Blue

Write-Host "   Keycloak servisi yeniden baslatiliyor..." -ForegroundColor Yellow
railway redeploy --service keycloack

Write-Host "   Keycloak servisinin baslamasi icin 90 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

Write-Host "   Backend servisi yeniden baslatiliyor..." -ForegroundColor Yellow
railway redeploy --service backend

Write-Host "   Backend servisinin baslamasi icin 30 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Railway Keycloak Duzelmeleri Tamamlandi!" -ForegroundColor Green
Write-Host ""
Write-Host "Kontrol Edilecek Noktalar:" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "1. Keycloak Admin Console: https://keycloack-production.up.railway.app/admin" -ForegroundColor White
Write-Host "2. Backend Health Check: https://business-portal-backend-production.up.railway.app/api/health" -ForegroundColor White
Write-Host "3. Backend Logs: railway logs --service backend" -ForegroundColor White
Write-Host "4. Keycloak Logs: railway logs --service keycloack" -ForegroundColor White
Write-Host ""
Write-Host "Beklenen Sonuclar:" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "DNS cozumleme hatalari duzelmeli (EAI_AGAIN)" -ForegroundColor White
Write-Host "SSL ayarlari otomatik olarak duzelmeli" -ForegroundColor White
Write-Host "Keycloak authentication basarili olmali" -ForegroundColor White
Write-Host "invalid_request hatalari kaybolmali" -ForegroundColor White
Write-Host ""
Write-Host "Hala Sorun Varsa:" -ForegroundColor Red
Write-Host "===================" -ForegroundColor Red
Write-Host "1. Railway dashboard'dan URL'lerin dogru oldugunu kontrol edin" -ForegroundColor White
Write-Host "2. Keycloak ve Backend servislerin calistigini dogrulayin" -ForegroundColor White
Write-Host "3. Network baglantisini test edin: curl https://keycloack-production.up.railway.app/health" -ForegroundColor White
Write-Host "4. Bu scripti tekrar calistirin" -ForegroundColor White
Write-Host ""
Write-Host "Support: Gerekirse Railway support'a basvurun" -ForegroundColor Magenta 