import { IsBoolean, IsDate, IsEmail, IsEnum, IsHexColor, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { SubscriptionPlanType, TenantStatus, TenantType } from '../entities/tenant-metadata.entity';
import { Type } from 'class-transformer';

export class CreateTenantDto {
  // Temel bilgiler (zorunlu)
  @IsNotEmpty({ message: 'Tenant adı gereklidir' })
  @IsString({ message: 'Tenant adı string olmalıdır' })
  @Length(2, 255, { message: 'Tenant adı 2-255 karakter arasında olmalıdır' })
  name: string;

  @IsNotEmpty({ message: 'Slug gereklidir' })
  @IsString({ message: 'Slug string olmalıdır' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug sadece küçük harfler, rakamlar ve tire içerebilir' })
  @Length(2, 100, { message: 'Slug 2-100 karakter arasında olmalıdır' })
  slug: string;

  // Temel bilgiler (opsiyonel)
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @IsNotEmpty({ message: 'Email gereklidir' })
  email: string;

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
  @IsEnum(TenantType, { message: 'Geçerli bir tenant tipi seçiniz: corporate veya individual' })
  @IsNotEmpty({ message: 'Tenant tipi gereklidir' })
  tenantType: TenantType;

  // Kurumsal bilgiler (kurumsal tenant için)
  @IsOptional()
  @IsString({ message: 'Vergi numarası string olmalıdır' })
  @Length(5, 50, { message: 'Vergi numarası 5-50 karakter arasında olmalıdır' })
  taxNumber?: string;

  @IsOptional()
  @IsString({ message: 'Vergi dairesi string olmalıdır' })
  @Length(2, 255, { message: 'Vergi dairesi 2-255 karakter arasında olmalıdır' })
  taxOffice?: string;

  @IsOptional()
  @IsString({ message: 'Sektör string olmalıdır' })
  industry?: string;

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
  @IsEnum(SubscriptionPlanType, { message: 'Geçerli bir abonelik planı seçiniz' })
  @IsOptional()
  planType?: SubscriptionPlanType;

  @IsOptional()
  @IsUUID('4', { message: 'Abonelik planı ID geçerli bir UUID olmalıdır' })
  subscriptionPlanId?: string;

  @IsOptional()
  @IsString({ message: 'Abonelik süresi geçerli bir değer olmalıdır' })
  @Matches(/^(1month|3months|6months|1year)$/, { message: 'Abonelik süresi 1month, 3months, 6months veya 1year olmalıdır' })
  subscriptionDuration?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Abonelik başlangıç tarihi ISO formatında olmalıdır (YYYY-MM-DD)' })
  subscriptionStartDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Abonelik bitiş tarihi ISO formatında olmalıdır (YYYY-MM-DD)' })
  subscriptionEndDate?: string;

  @IsOptional()
  @IsBoolean({ message: 'Ödeme durumu boolean olmalıdır' })
  paymentStatus?: boolean;

  // Özelleştirme bilgileri
  @IsOptional()
  @IsString({ message: 'Logo URL string olmalıdır' })
  logoUrl?: string;

  @IsOptional()
  @IsString({ message: 'Ana renk string olmalıdır' })
  primaryColor?: string;

  @IsOptional()
  @IsString({ message: 'İkincil renk string olmalıdır' })
  secondaryColor?: string;

  @IsOptional()
  @IsString({ message: 'Özel alan adı string olmalıdır' })
  @Length(3, 255, { message: 'Özel alan adı 3-255 karakter arasında olmalıdır' })
  customDomain?: string;

  // Kullanım bilgileri
  @IsOptional()
  @IsInt({ message: 'Kullanıcı kotası tam sayı olmalıdır' })
  @Min(1, { message: 'Kullanıcı kotası en az 1 olmalıdır' })
  @Max(10000, { message: 'Kullanıcı kotası en fazla 10000 olmalıdır' })
  @Type(() => Number)
  userQuota?: number;

  // Admin kullanıcı bilgileri (zorunlu)
  @IsNotEmpty({ message: 'Admin kullanıcı adı gereklidir' })
  @IsString({ message: 'Admin kullanıcı adı string olmalıdır' })
  @Length(2, 100, { message: 'Admin kullanıcı adı 2-100 karakter arasında olmalıdır' })
  adminFirstName: string;

  @IsNotEmpty({ message: 'Admin kullanıcı soyadı gereklidir' })
  @IsString({ message: 'Admin kullanıcı soyadı string olmalıdır' })
  @Length(2, 100, { message: 'Admin kullanıcı soyadı 2-100 karakter arasında olmalıdır' })
  adminLastName: string;

  @IsEmail({}, { message: 'Geçerli bir admin email adresi giriniz' })
  @IsNotEmpty({ message: 'Admin email gereklidir' })
  adminEmail: string;

  @IsNotEmpty({ message: 'Admin şifresi gereklidir' })
  @IsString({ message: 'Admin şifresi string olmalıdır' })
  @Length(8, 100, { message: 'Şifre en az 8, en fazla 100 karakter olmalıdır' })
  adminPassword: string;

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
