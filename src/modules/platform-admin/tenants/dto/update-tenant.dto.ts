import { IsBoolean, IsDate, IsEmail, IsEnum, IsHexColor, IsInt, IsISO8601, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { SubscriptionPlanType, TenantStatus, TenantType } from '../entities/tenant-metadata.entity';
import { Transform, Type } from 'class-transformer';

export class UpdateTenantDto {
  // Temel bilgiler
  @IsOptional()
  @IsString({ message: 'Tenant adı string olmalıdır' })
  @Length(2, 255, { message: 'Tenant adı 2-255 karakter arasında olmalıdır' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Slug string olmalıdır' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug sadece küçük harfler, rakamlar ve tire içerebilir' })
  @Length(2, 100, { message: 'Slug 2-100 karakter arasında olmalıdır' })
  slug?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Şirket adı string olmalıdır' })
  @Length(2, 255, { message: 'Şirket adı 2-255 karakter arasında olmalıdır' })
  companyName?: string;

  @IsOptional()
  @IsString({ message: 'İlçe string olmalıdır' })
  @Length(2, 100, { message: 'İlçe 2-100 karakter arasında olmalıdır' })
  district?: string;

  @IsOptional()
  @IsString({ message: 'Şehir string olmalıdır' })
  @Length(2, 100, { message: 'Şehir 2-100 karakter arasında olmalıdır' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Telefon string olmalıdır' })
  @Length(5, 50, { message: 'Telefon 5-50 karakter arasında olmalıdır' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Adres string olmalıdır' })
  address?: string;

  // Tenant tipi
  @IsOptional()
  @IsEnum(TenantType, { message: 'Geçerli bir tenant tipi seçiniz: corporate veya individual' })
  tenantType?: TenantType;

  // Kurumsal bilgiler (kurumsal tenant için)
  @IsOptional()
  @IsString({ message: 'Vergi numarası string olmalıdır' })
  @Length(5, 50, { message: 'Vergi numarası 5-50 karakter arasında olmalıdır' })
  taxNumber?: string;

  @IsOptional()
  @IsString({ message: 'Vergi dairesi string olmalıdır' })
  @Length(2, 255, { message: 'Vergi dairesi 2-255 karakter arasında olmalıdır' })
  taxOffice?: string;

  // Eski industry alanı kaldırıldı, sadece ilişkisel olan industryId kullanılıyor
  @IsOptional()
  @IsUUID('4', { message: 'Sektör ID geçerli bir UUID olmalıdır' })
  industryId?: string;

  // Durum bilgileri
  @IsOptional()
  @IsEnum(TenantStatus, { message: 'Geçerli bir tenant durumu seçiniz' })
  status?: TenantStatus;

  @IsOptional()
  @IsString({ message: 'Askıya alınma sebebi string olmalıdır' })
  suspensionReason?: string;

  // Abonelik bilgileri
  // Eski planType alanı kaldırıldı, yerine ilişkisel subscriptionPlanId kullanılıyor
  @IsOptional()
  @IsUUID('4', { message: 'Abonelik planı ID geçerli bir UUID olmalıdır' })
  subscriptionPlanId?: string;

  @IsOptional()
  @IsString({ message: 'Abonelik süresi string olmalıdır' })
  @Length(2, 20, { message: 'Abonelik süresi 2-20 karakter arasında olmalıdır' })
  subscriptionDuration?: string; // 1month, 3months, 6months, 1year

  @IsOptional()
  // Tarih validasyonunu gevşeterek string ve Date tiplerini kabul ediyoruz
  @Transform(({ value }) => {
    // Eğer string ise ve geçerli bir ISO formatında ise Date'e çevir
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      // Geçersiz tarih formatı ise olduğu gibi bırak, servis katmanında işlenecek
      return value;
    }
    // Zaten Date tipinde ise olduğu gibi bırak
    return value;
  })
  subscriptionStartDate?: Date | string;

  @IsOptional()
  // Tarih validasyonunu gevşeterek string ve Date tiplerini kabul ediyoruz
  @Transform(({ value }) => {
    // Eğer string ise ve geçerli bir ISO formatında ise Date'e çevir
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      // Geçersiz tarih formatı ise olduğu gibi bırak, servis katmanında işlenecek
      return value;
    }
    // Zaten Date tipinde ise olduğu gibi bırak
    return value;
  })
  subscriptionEndDate?: Date | string;

  @IsOptional()
  @IsBoolean({ message: 'Ödeme durumu boolean olmalıdır' })
  paymentStatus?: boolean;

  // Özelleştirme bilgileri
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL geçerli bir URL olmalıdır' })
  logoUrl?: string;

  @IsOptional()
  @IsHexColor({ message: 'Ana renk geçerli bir HEX renk kodu olmalıdır (#RRGGBB)' })
  primaryColor?: string;

  @IsOptional()
  @IsHexColor({ message: 'İkincil renk geçerli bir HEX renk kodu olmalıdır (#RRGGBB)' })
  secondaryColor?: string;

  @IsOptional()
  @IsString({ message: 'Özel alan adı string olmalıdır' })
  @Length(3, 255, { message: 'Özel alan adı 3-255 karakter arasında olmalıdır' })
  customDomain?: string;

  // Kullanım bilgileri
  @IsOptional()
  @IsInt({ message: 'Aktif kullanıcı sayısı tam sayı olmalıdır' })
  @Min(0, { message: 'Aktif kullanıcı sayısı negatif olamaz' })
  @Type(() => Number)
  activeUserCount?: number;

  @IsOptional()
  @IsInt({ message: 'Kullanıcı kotası tam sayı olmalıdır' })
  @Min(1, { message: 'Kullanıcı kotası en az 1 olmalıdır' })
  @Max(10000, { message: 'Kullanıcı kotası en fazla 10000 olmalıdır' })
  @Type(() => Number)
  userQuota?: number;

  // Admin kullanıcı referansı
  @IsOptional()
  @IsUUID('4', { message: 'Geçerli bir admin kullanıcı ID giriniz' })
  adminUserId?: string;

  // Keycloak kullanıcı ID'si
  @IsOptional()
  @IsString({ message: 'Keycloak ID string olmalıdır' })
  keycloakId?: string;

  // Veritabanı bilgileri (sadece platform admin için)
  @IsOptional()
  @IsString({ message: 'Veritabanı adı string olmalıdır' })
  @Length(2, 100, { message: 'Veritabanı adı 2-100 karakter arasında olmalıdır' })
  databaseName?: string;

  @IsOptional()
  @IsString({ message: 'Veritabanı bağlantı stringi string olmalıdır' })
  databaseConnectionString?: string;

  // Kişi bilgileri
  @IsOptional()
  @IsString({ message: 'Ad string olmalıdır' })
  @Length(2, 100, { message: 'Ad 2-100 karakter arasında olmalıdır' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Soyad string olmalıdır' })
  @Length(2, 100, { message: 'Soyad 2-100 karakter arasında olmalıdır' })
  lastName?: string;
}
