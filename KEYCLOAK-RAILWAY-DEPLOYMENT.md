# Keycloak Railway Deployment Rehberi

Business Portal için Keycloak identity provider servisinin Railway'de deploy edilmesi.

## 🚀 Railway Keycloak Deployment

### Önkoşullar

1. **Railway hesabı** - [railway.app](https://railway.app)
2. **PostgreSQL Plugin** - Keycloak için ayrı PostgreSQL instance
3. **Business Portal realm konfigürasyonu** - keycloak-realm-config.json

### Deployment Adımları

#### 1. Yeni Railway Servisi Oluştur

```bash
# Railway dashboard'dan yeni servis oluştur
# Template: Empty Service
# Service Name: business-portal-keycloak
```

#### 2. PostgreSQL Plugin Ekle

```bash
# Railway dashboard → Add Plugin → PostgreSQL
# Keycloak için ayrı database instance gerekli
```

#### 3. Keycloak Docker Image Deploy

Railway'de Custom Dockerfile veya Docker Image deployment:

```dockerfile
FROM quay.io/keycloak/keycloak:latest

# Railway için özel ayarlar
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HOSTNAME_STRICT_HTTPS=false
ENV KC_PROXY=edge

# Production mode için
ENV KC_DB=postgres

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready || exit 1

EXPOSE 8080

# Import realm config on startup
COPY keycloak-realm-config.json /opt/keycloak/data/import/realm.json

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm"]
```

#### 4. Environment Variables Ayarları

Railway dashboard'dan aşağıdaki environment variables'ları ekleyin:

```env
# Keycloak Admin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your-strong-admin-password

# Database (Railway PostgreSQL plugin variables)
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
KC_DB_USERNAME=${{Postgres.PGUSER}}
KC_DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Railway Proxy ayarları
KC_PROXY=edge
KC_HOSTNAME_STRICT=false
KC_HOSTNAME_STRICT_HTTPS=false
KC_HTTP_ENABLED=true

# Features
KC_FEATURES=preview,scripts,organization

# CSP ayarları - Frontend URL'leri
KC_SPI_CONTENT_SECURITY_POLICY_FRAME_ANCESTORS='self' https://business-portal-frontend-production.up.railway.app https://*.up.railway.app
KC_SPI_X_FRAME_OPTIONS=SAMEORIGIN

# Hostname (Railway tarafından sağlanacak)
KC_HOSTNAME=business-portal-keycloak-production.up.railway.app
```

#### 5. Realm Konfigürasyonu Import

Keycloak başlangıçta realm konfigürasyonunu import etmesi için:

```bash
# keycloak-realm-config.json dosyasını Keycloak container'ına mount edin
# Başlangıç komutuna --import-realm flag'i ekleyin
```

#### 6. Port Ayarları

```env
PORT=8080  # Railway otomatik olarak sağlar
```

### 🔧 Alternative: Keycloak as Code

Manuel realm import yerine, kod ile konfigürasyon:

```javascript
// keycloak-setup.js
const KcAdminClient = require('@keycloak/keycloak-admin-client').default;

async function setupKeycloak() {
  const kcAdminClient = new KcAdminClient({
    baseUrl: process.env.KEYCLOAK_URL,
    realmName: 'master',
  });

  await kcAdminClient.auth({
    username: process.env.KEYCLOAK_ADMIN,
    password: process.env.KEYCLOAK_ADMIN_PASSWORD,
    grantType: 'password',
    clientId: 'admin-cli',
  });

  // Realm oluştur
  await kcAdminClient.realms.create({
    realm: 'nexus-portal',
    enabled: true,
    // ... diğer ayarlar
  });

  // Client oluştur
  await kcAdminClient.clients.create({
    realm: 'nexus-portal',
    clientId: 'business-portal',
    // ... client ayarları
  });

  console.log('Keycloak setup completed!');
}

setupKeycloak().catch(console.error);
```

### 🚨 Önemli Notlar

#### Security Considerations

1. **Admin Password**: Güçlü admin password kullanın
2. **Database**: Keycloak için ayrı PostgreSQL instance
3. **HTTPS**: Railway otomatik HTTPS sağlar
4. **Cors**: Frontend URL'lerini doğru ayarlayın

#### Production Settings

```env
# Production için önemli ayarlar
KC_LOG_LEVEL=INFO
KC_CACHE=ispn
KC_CACHE_STACK=kubernetes

# Session ayarları
KC_SPI_STICKY_SESSION_ENCODER=infinispan
KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_SUPPRESS_LOGOUT_CONFIRMATION_SCREEN=true
```

### 🔍 Monitoring & Troubleshooting

#### Health Checks

```bash
# Keycloak health endpoint
curl https://business-portal-keycloak-production.up.railway.app/health

# Admin console
https://business-portal-keycloak-production.up.railway.app/admin
```

#### Common Issues

1. **Database Connection**
   ```bash
   # PostgreSQL connection string kontrol edin
   # KC_DB_URL format: jdbc:postgresql://host:port/database
   ```

2. **Memory Issues**
   ```bash
   # Railway'de memory limit artırın
   # JVM heap size ayarlayın: -Xmx512m
   ```

3. **Startup Time**
   ```bash
   # İlk başlangıç uzun sürebilir (realm import)
   # Health check timeout'u artırın
   ```

### 📋 Deployment Checklist

- [ ] Railway PostgreSQL plugin eklenmiş
- [ ] Environment variables ayarlanmış
- [ ] Keycloak admin credentials ayarlanmış
- [ ] Realm konfigürasyonu hazırlanmış
- [ ] Frontend/Backend URL'leri güncellenmiş
- [ ] CORS ayarları yapılmış
- [ ] Health check çalışıyor
- [ ] Admin console erişilebilir

### 🔗 URL'ler

- **Keycloak Admin Console**: `https://business-portal-keycloak-production.up.railway.app/admin`
- **Realm URL**: `https://business-portal-keycloak-production.up.railway.app/realms/nexus-portal`
- **OpenID Configuration**: `https://business-portal-keycloak-production.up.railway.app/realms/nexus-portal/.well-known/openid_configuration`

### 🆘 Support

Keycloak deployment sorunları için:
- Railway logs kontrol edin
- Keycloak documentation: https://www.keycloak.org/documentation
- Environment variables doğruluğunu kontrol edin
- Database connectivity test edin 