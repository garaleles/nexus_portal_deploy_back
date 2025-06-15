# Business Portal Backend - Railway Deployment

Business Portal uygulamasının backend servisi. NestJS, PostgreSQL ve Keycloak ile geliştirilmiş multi-tenant SaaS platformu.

## 🚀 Railway.com Deployment

### Önkoşullar

1. **Railway hesabı** - [railway.app](https://railway.app) üzerinden kayıt olun
2. **GitHub repository** - Backend kodu garaleles/nexus_portal_deploy_back repository'sinde
3. **PostgreSQL Plugin** - Railway üzerinden PostgreSQL servisi ekleyin
4. **Keycloak Service** - Ayrı bir Railway servisi olarak deploy edilmeli

### Railway Deployment Adımları

#### 1. PostgreSQL Database Kurulumu
```bash
# Railway dashboard'dan PostgreSQL plugin ekleyin
# Otomatik olarak DATABASE_URL ve diğer env variables oluşacak
```

#### 2. Environment Variables Ayarları
Railway dashboard'dan aşağıdaki environment variables'ları ayarlayın:

```env
# Database (Railway PostgreSQL plugin otomatik sağlar)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}

# JWT Configuration
JWT_SECRET=your-jwt-secret-key

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=Nexus Business Portal
MAIL_FROM_ADDRESS=no-reply@nexus.com

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
ENCRYPTION_IV=your-16-character-encryption-iv

# Keycloak Configuration
KEYCLOAK_URL=https://business-portal-keycloak-production.up.railway.app
KEYCLOAK_REALM=nexus-portal
KEYCLOAK_CLIENT_ID=business-portal
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REDIRECT_URI=https://business-portal-frontend-production.up.railway.app/auth/callback

# Keycloak Role Configuration
SCOP_NAME=b2b-order-management
KEY=b2b_roles
ROLE=Owner_Admin

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Super Admin Configuration
SUPER_ADMIN_EMAIL=your-admin@email.com
SUPER_ADMIN_PASSWORD=your-strong-password
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
SUPER_ADMIN_KEYCLOACK_ID=""

# Frontend URL
FRONTEND_URL=https://business-portal-frontend-production.up.railway.app
```

#### 3. Railway Service Ayarları

Railway dashboard'dan service ayarlarını yapın:

- **Service Name**: business-portal-backend
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:prod`
- **Port**: Railway otomatik olarak PORT env variable sağlar

#### 4. Custom Domain Ayarları (Opsiyonel)

Railway'den custom domain ekleyebilirsiniz:
```
your-domain.com → backend servisi
```

### 🔧 Development Setup

Yerel geliştirme için:

```bash
# Dependencies
npm install

# Environment setup
cp .env.example .env
# .env dosyasını kendi ayarlarınızla doldurun

# Database setup
npm run migration:run

# Development server
npm run start:dev
```

### 📋 API Endpoints

- **Health Check**: `GET /api/health`
- **Swagger Documentation**: `GET /api/docs`
- **Platform Admin**: `GET /api/platform-admin/*`
- **Tenant Management**: `GET /api/tenants/*`

### 🐳 Docker Support

Railway otomatik olarak Dockerfile'ı kullanacak:

```bash
# Manuel Docker build (yerel test için)
docker build -t business-portal-backend .
docker run -p 3000:3000 business-portal-backend
```

### 🔒 Security Features

- **Helmet.js** güvenlik headers
- **CORS** yapılandırması
- **JWT** authentication
- **Keycloak** integration
- **Rate limiting**
- **Input validation**

### 📊 Monitoring

Railway otomatik olarak sağlar:
- **Logs** - Railway dashboard'dan erişilebilir
- **Metrics** - CPU, Memory, Network kullanımı
- **Health Checks** - `/api/health` endpoint üzerinden

### 🚨 Troubleshooting

#### Database Bağlantı Sorunları
```bash
# Railway PostgreSQL plugin ayarlarını kontrol edin
# DATABASE_URL environment variable'ının doğru ayarlandığından emin olun
```

#### Keycloak Bağlantı Sorunları
```bash
# KEYCLOAK_URL'in doğru Keycloak service URL'ine işaret ettiğinden emin olun
# Keycloak service'inin çalıştığından emin olun
```

#### CORS Sorunları
```bash
# FRONTEND_URL environment variable'ının doğru frontend URL'ine işaret ettiğinden emin olun
# main.ts içindeki CORS ayarlarını kontrol edin
```

### 📞 Support

Herhangi bir sorun durumunda:
- Railway deployment loglarını kontrol edin
- Environment variables ayarlarını doğrulayın
- GitHub Issues üzerinden destek talep edin 

<!-- Trigger for Railway deployment --> 