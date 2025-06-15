# Railway Deployment Rehberi

Business Portal Backend'in Railway'de deploy edilmesi için detaylı adım adım rehber.

## 🚀 Ön Hazırlık

### 1. Railway Hesabı ve Proje
- [Railway.app](https://railway.app) hesabı oluşturun
- GitHub repository'nizi Railway'e bağlayın

### 2. Gerekli Servisler
Railway dashboard'da şu servisleri oluşturun:
- **PostgreSQL Database** (Plugin olarak)
- **Keycloak Service** (Manual deployment)
- **Backend Service** (Bu repository)

## 📋 Deployment Sırası

### ADIM 1: PostgreSQL Database Plugin
1. Railway Dashboard → "Add Service" → "Database" → "PostgreSQL"
2. PostgreSQL instance otomatik olarak oluşturulur
3. Environment variables hazır olur: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DATABASE_URL`

### ADIM 2: Keycloak Service Deploy

#### 2.1 Keycloak Servisi Oluştur
1. Railway Dashboard → "Add Service" → "Empty Service"
2. Service Name: `business-portal-keycloak`

#### 2.2 Keycloak Için Ayrı PostgreSQL
1. Keycloak service'ine PostgreSQL plugin ekle
2. Keycloak kendi database'ini kullanacak

#### 2.3 Keycloak Environment Variables
```env
# Admin Credentials
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your-super-secure-password

# Database (Keycloak PostgreSQL plugin variables)
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
KC_DB_USERNAME=${{Postgres.PGUSER}}
KC_DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Railway Configuration
KC_PROXY=edge
KC_HOSTNAME_STRICT=false
KC_HOSTNAME_STRICT_HTTPS=false
KC_HTTP_ENABLED=true
KC_FEATURES=preview,scripts

# Port
PORT=8080
```

#### 2.4 Keycloak Dockerfile
Keycloak servisi için ayrı Dockerfile oluşturun:

```dockerfile
FROM quay.io/keycloak/keycloak:latest

# Railway için özel ayarlar
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HOSTNAME_STRICT_HTTPS=false
ENV KC_PROXY=edge
ENV KC_DB=postgres

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready || exit 1

EXPOSE 8080

# Realm config'i import et
COPY keycloak-realm-config.json /opt/keycloak/data/import/realm.json

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm"]
```

#### 2.5 Keycloak Deploy ve Test
1. Keycloak servisi deploy edin
2. Admin console'a erişip realm'ı kontrol edin: `https://your-keycloak-service.up.railway.app/admin`

### ADIM 3: Backend Service Deploy

#### 3.1 Backend Environment Variables
Railway'de backend servisiniz için şu environment variables'ları ayarlayın:

```env
# Application
NODE_ENV=production
PORT=${{PORT}}

# Database (Backend PostgreSQL plugin variables)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}

# JWT
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Keycloak Configuration (Keycloak servisinden alınacak)
KEYCLOAK_URL=https://your-keycloak-service.up.railway.app
KEYCLOAK_REALM=nexus-portal
KEYCLOAK_CLIENT_ID=business-portal
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=your-super-secure-password
KEYCLOAK_REDIRECT_URI=https://your-frontend-service.up.railway.app/auth/callback

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=Business Portal
MAIL_FROM_ADDRESS=your-email@gmail.com

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here!
ENCRYPTION_IV=your-16-char-iv-here

# Super Admin
SUPER_ADMIN_EMAIL=admin@your-domain.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=https://your-frontend-service.up.railway.app
```

#### 3.2 Backend Deploy
1. Repository'yi Railway'e push edin
2. Build süreci otomatik başlar
3. Health check endpoint'i test edin: `/api/health`

## 🔧 Deploy Sonrası Konfigürasyon

### 1. Keycloak Realm Import (Otomatik)
Backend başladıktan sonra, Keycloak realm'ı otomatik import edilmeli. Eğer manuel yapmak isterseniz:

```bash
# Local'de test için
cd business-portal-back
npm run keycloak:setup
```

### 2. Frontend URL'leri Güncelle
Tüm servislerin deploy edilmesinden sonra:
1. Keycloak admin console → `nexus-portal` realm → Clients → `business-portal`
2. Valid Redirect URIs ve Web Origins'i frontend URL'i ile güncelleyin

### 3. Database Migration (Otomatik)
Backend başlarken TypeORM synchronize çalışır ve tabloları oluşturur.

## 🐛 Troubleshooting

### Health Check Fail
```bash
# Health check test
curl https://your-backend-service.up.railway.app/api/health

# Response should be:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "port": 3000,
  "version": "1.0.0",
  "service": "business-portal-backend"
}
```

### Keycloak Connection Issues
1. Backend loglarını kontrol edin: "Keycloak bağlantısı kurulamadı"
2. Keycloak URL'nin doğru olduğunu kontrol edin
3. Keycloak admin credentials'ları test edin

### Database Connection Issues
1. PostgreSQL plugin'in aktif olduğunu kontrol edin
2. `DATABASE_URL` environment variable'ının doğru set edildiğini kontrol edin
3. Database logs'ları inceleyin

### Memory Issues
Railway'de memory limit'i artırın:
1. Service Settings → Memory Limit → 1GB veya üzeri

## 📊 Monitoring

### Health Endpoints
- Backend: `https://your-backend.up.railway.app/api/health`
- Keycloak: `https://your-keycloak.up.railway.app/health`

### Logs
Railway dashboard'dan real-time logs izleyebilirsiniz.

### Metrics
Railway otomatik olarak CPU, Memory, Network metrics sağlar.

## 🔒 Security Checklist

- [ ] Güçlü JWT_SECRET kullanıldı
- [ ] Keycloak admin şifresi güçlü
- [ ] Database credentials güvenli
- [ ] CORS ayarları doğru frontend URL'leri içeriyor
- [ ] HTTPS kullanılıyor (Railway otomatik)
- [ ] Environment variables gizli bilgileri içermiyor

## 📞 Support

Deployment sorunları için:
1. Railway logs'ları kontrol edin
2. Health check endpoint'lerini test edin
3. Environment variables'ları doğrulayın
4. Database bağlantısını test edin

---

**Önemli**: Railway'de her push sonrası otomatik deployment tetiklenir. Production için branch protection kullanmayı unutmayın! 