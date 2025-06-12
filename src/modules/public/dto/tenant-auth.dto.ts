import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TenantLoginDto {
  @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @IsNotEmpty({ message: 'Şifre alanı zorunludur' })
  @IsString({ message: 'Şifre string olmalıdır' })
  password: string;
}

export class TenantHistoryCheckDto {
  @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;
}

export class TenantProfileResponseDto {
  id: string;
  name: string;
  slug: string;
  email: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  taxNumber?: string;
  taxOffice?: string;
  industryId?: string;
}

export class TenantLoginResponseDto {
  success: boolean;
  message: string;
  token?: string;
  profile?: TenantProfileResponseDto;
}

export class TenantHistoryResponseDto {
  hasHistory: boolean;
  message: string;
  profile?: TenantProfileResponseDto;
} 