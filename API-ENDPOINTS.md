# Portal Yönetimi API Endpoints

Bu dokümanda Nexus Business Portal Management API'sinin tüm endpoint'leri listelenmektedir.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Tüm API endpoint'leri (belirtilen hariç) Keycloak JWT token ile korunmaktadır.

```bash
Authorization: Bearer <keycloak-jwt-token>
```

## Platform Admin - Tenant Management

### 1. Tenant Oluşturma
```http
POST /platform-admin/tenants
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

**Body:**
```json
{
  "name": "ACME Corp",
  "slug": "acme-corp",
  "email": "admin@acme.com",
  "phone": "+90 212 123 45 67",
  "address": "İstanbul, Türkiye",
  "tenantType": "corporate",
  "taxNumber": "1234567890",
  "industryId": "uuid-industry-id",
  "companyName": "ACME Corporation",
  "district": "Şişli",
  "city": "İstanbul",
  "subscriptionPlanId": "uuid-plan-id",
  "subscriptionDuration": "1year",
  "subscriptionStartDate": "2024-01-01T00:00:00.000Z",
  "subscriptionEndDate": "2024-12-31T23:59:59.999Z",
  "customDomain": "acme.example.com",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "adminEmail": "john@acme.com",
  "adminPassword": "SecurePassword123!"
}
```

### 2. Tüm Tenant'ları Listele
```http
GET /platform-admin/tenants
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN, SUPPORT_AGENT

### 3. Tenant Detayını Getir
```http
GET /platform-admin/tenants/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN, SUPPORT_AGENT

### 4. Slug ile Tenant Bul
```http
GET /platform-admin/tenants/slug/{slug}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN, SUPPORT_AGENT

### 5. Tenant Güncelle
```http
PATCH /platform-admin/tenants/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 6. Tenant Durumunu Güncelle
```http
PATCH /platform-admin/tenants/{id}/status
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

**Body:**
```json
{
  "status": "active|inactive|suspended|pending",
  "reason": "Durumsal açıklama (opsiyonel)"
}
```

### 7. Tenant Sil
```http
DELETE /platform-admin/tenants/{id}
```
**Gerekli Roller:** SUPER_ADMIN

## Platform Admin - User Management

### 1. Platform Kullanıcısı Oluşturma
```http
POST /platform-admin/users
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 2. Tüm Platform Kullanıcılarını Listele
```http
GET /platform-admin/users
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 3. Platform Kullanıcısı Detayını Getir
```http
GET /platform-admin/users/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 4. Platform Kullanıcısını Güncelle
```http
PATCH /platform-admin/users/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 5. Platform Kullanıcısını Sil
```http
DELETE /platform-admin/users/{id}
```
**Gerekli Roller:** SUPER_ADMIN

### 6. Kullanıcı Rolünü Güncelle
```http
PATCH /platform-admin/users/{id}/role
```
**Gerekli Roller:** SUPER_ADMIN

**Body:**
```json
{
  "role": "superAdmin|platformAdmin|supportAgent|contentManager"
}
```

### 7. Kullanıcı Durumunu Güncelle
```http
PATCH /platform-admin/users/{id}/status
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

**Body:**
```json
{
  "status": "active|inactive|suspended"
}
```

## Platform Admin - Subscription Plans

### 1. Abonelik Planlarını Listele
```http
GET /platform-admin/subscription-plans
```

### 2. Abonelik Planı Detayını Getir
```http
GET /platform-admin/subscription-plans/{id}
```

### 3. Abonelik Planı Oluştur
```http
POST /platform-admin/subscription-plans
```
**Gerekli Roller:** SUPER_ADMIN

### 4. Abonelik Planını Güncelle
```http
PATCH /platform-admin/subscription-plans/{id}
```
**Gerekli Roller:** SUPER_ADMIN

### 5. Abonelik Planını Sil
```http
DELETE /platform-admin/subscription-plans/{id}
```
**Gerekli Roller:** SUPER_ADMIN

## Platform Admin - Industries

### 1. Sektörleri Listele
```http
GET /platform-admin/industries
```

### 2. Sektör Detayını Getir
```http
GET /platform-admin/industries/{id}
```

### 3. Sektör Oluştur
```http
POST /platform-admin/industries
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 4. Sektörü Güncelle
```http
PATCH /platform-admin/industries/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 5. Sektörü Sil
```http
DELETE /platform-admin/industries/{id}
```
**Gerekli Roller:** SUPER_ADMIN

## Platform Admin - Company Info

### 1. Şirket Bilgilerini Listele
```http
GET /platform-admin/company-info
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 2. İlk Şirket Bilgisini Getir
```http
GET /platform-admin/company-info/first
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 3. Şirket Bilgisi Detayını Getir
```http
GET /platform-admin/company-info/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 4. Şirket Bilgisi Oluştur
```http
POST /platform-admin/company-info
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

**Body:**
```json
{
  "name": "ACME Corporation",
  "address": "İstanbul, Türkiye",
  "phone": "+90 212 123 45 67",
  "email": "info@acme.com",
  "taxOffice": "Kadıköy Vergi Dairesi",
  "taxNumber": "1234567890",
  "googleMapsApiKey": "your-google-maps-api-key",
  "locationLat": 41.0082,
  "locationLng": 28.9784,
  "bank1Name": "Ziraat Bankası",
  "bank1AccountHolder": "ACME Corporation",
  "bank1AccountNumber": "12345678",
  "bank1IBAN": "TR123456789012345678901234",
  "bank2Name": "İş Bankası",
  "bank2AccountHolder": "ACME Corporation",
  "bank2AccountNumber": "87654321",
  "bank2IBAN": "TR987654321098765432109876",
  "whatsapp": "https://wa.me/905321234567",
  "facebook": "https://facebook.com/acme",
  "twitter": "https://twitter.com/acme",
  "instagram": "https://instagram.com/acme",
  "youtube": "https://youtube.com/acme",
  "linkedin": "https://linkedin.com/company/acme",
  "footerText": "© 2024 ACME Corporation. Tüm hakları saklıdır.",
  "about": "ACME Corporation hakkında bilgiler...",
  "mission": "Misyonumuz...",
  "vision": "Vizyonumuz...",
  "logoUrl": "/assets/images/logo.png",
  "invoiceLogoUrl": "/assets/images/invoice-logo.png"
}
```

### 5. Şirket Bilgisini Güncelle
```http
PATCH /platform-admin/company-info/{id}
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

### 6. Şirket Bilgisi Oluştur veya Güncelle (Upsert)
```http
PUT /platform-admin/company-info/create-or-update
```
**Gerekli Roller:** SUPER_ADMIN, PLATFORM_ADMIN

**Body:** (Yukarıdaki POST body'si ile aynı, tüm alanlar opsiyonel)

### 7. Şirket Bilgisini Sil
```http
DELETE /platform-admin/company-info/{id}
```
**Gerekli Roller:** SUPER_ADMIN

## Tenant Detection Headers

API, tenant'ı aşağıdaki yöntemlerle belirler:

1. **Header ile:** `X-Tenant-Slug: acme-corp`
2. **Subdomain ile:** `acme-corp.yourdomain.com`
3. **Query parameter ile:** `?tenant=acme-corp`

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Authorization header bulunamadı",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Bu işlem için gerekli rol(ler): SUPER_ADMIN",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Tenant bulunamadı",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "E-posta adresi zaten kullanılıyor",
  "error": "Conflict"
}
```

## Development Setup

1. Environment variables'ları ayarlayın (.env dosyası)
2. Database'i çalıştırın
3. Keycloak'ı kurun ve yapılandırın
4. Uygulamayı başlatın: `npm run start:dev`

## Super Admin Seeding

Uygulama ilk başlatıldığında otomatik olarak super admin kullanıcısı oluşturulur:
- Keycloak'ta kullanıcı kaydı kontrol edilir
- Veritabanında platform_users tablosuna kayıt eklenir
- Her iki yerde de mevcutsa işlem geçilir 