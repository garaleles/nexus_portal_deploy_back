import { IsEmail, IsOptional, IsString, IsNumber, Length } from 'class-validator';

export class UpdateCompanyInfoDto {
  @IsOptional()
  @IsString({ message: 'Şirket adı string olmalıdır' })
  @Length(2, 255, { message: 'Şirket adı 2-255 karakter arasında olmalıdır' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Adres string olmalıdır' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Telefon string olmalıdır' })
  @Length(5, 50, { message: 'Telefon 5-50 karakter arasında olmalıdır' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Vergi dairesi string olmalıdır' })
  @Length(2, 255, { message: 'Vergi dairesi 2-255 karakter arasında olmalıdır' })
  taxOffice?: string;

  @IsOptional()
  @IsString({ message: 'Vergi numarası string olmalıdır' })
  @Length(5, 50, { message: 'Vergi numarası 5-50 karakter arasında olmalıdır' })
  taxNumber?: string;

  @IsOptional()
  @IsString({ message: 'Google Maps API anahtarı string olmalıdır' })
  googleMapsApiKey?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Lokasyon enlem değeri sayı olmalıdır' })
  locationLat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Lokasyon boylam değeri sayı olmalıdır' })
  locationLng?: number;

  // Bank 1 bilgileri
  @IsOptional()
  @IsString({ message: 'Banka adı string olmalıdır' })
  bank1Name?: string;

  @IsOptional()
  @IsString({ message: 'Hesap sahibi string olmalıdır' })
  bank1AccountHolder?: string;

  @IsOptional()
  @IsString({ message: 'Hesap numarası string olmalıdır' })
  bank1AccountNumber?: string;

  @IsOptional()
  @IsString({ message: 'IBAN string olmalıdır' })
  bank1IBAN?: string;

  // Bank 2 bilgileri
  @IsOptional()
  @IsString({ message: 'Banka adı string olmalıdır' })
  bank2Name?: string;

  @IsOptional()
  @IsString({ message: 'Hesap sahibi string olmalıdır' })
  bank2AccountHolder?: string;

  @IsOptional()
  @IsString({ message: 'Hesap numarası string olmalıdır' })
  bank2AccountNumber?: string;

  @IsOptional()
  @IsString({ message: 'IBAN string olmalıdır' })
  bank2IBAN?: string;

  // Sosyal medya linkları
  @IsOptional()
  @IsString({ message: 'WhatsApp linki string olmalıdır' })
  whatsapp?: string;

  @IsOptional()
  @IsString({ message: 'Facebook linki string olmalıdır' })
  facebook?: string;

  @IsOptional()
  @IsString({ message: 'Twitter linki string olmalıdır' })
  twitter?: string;

  @IsOptional()
  @IsString({ message: 'Instagram linki string olmalıdır' })
  instagram?: string;

  @IsOptional()
  @IsString({ message: 'YouTube linki string olmalıdır' })
  youtube?: string;

  @IsOptional()
  @IsString({ message: 'LinkedIn linki string olmalıdır' })
  linkedin?: string;

  // İçerik bilgileri
  @IsOptional()
  @IsString({ message: 'Footer metni string olmalıdır' })
  footerText?: string;

  @IsOptional()
  @IsString({ message: 'Hakkımızda metni string olmalıdır' })
  about?: string;

  @IsOptional()
  @IsString({ message: 'Misyon metni string olmalıdır' })
  mission?: string;

  @IsOptional()
  @IsString({ message: 'Vizyon metni string olmalıdır' })
  vision?: string;

  // Logo bilgileri
  @IsOptional()
  @IsString({ message: 'Logo public ID string olmalıdır' })
  logoPublicId?: string;

  @IsOptional()
  @IsString({ message: 'Logo URL string olmalıdır' })
  logoUrl?: string;

  @IsOptional()
  @IsString({ message: 'Fatura logosu public ID string olmalıdır' })
  invoiceLogoPublicId?: string;

  @IsOptional()
  @IsString({ message: 'Fatura logosu URL string olmalıdır' })
  invoiceLogoUrl?: string;
} 