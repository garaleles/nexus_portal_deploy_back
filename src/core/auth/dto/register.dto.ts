import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, Matches, MaxLength, IsBoolean } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  companyName?: string;

  @IsNotEmpty({ message: 'Ad alanı zorunludur' })
  @IsString()
  @MinLength(3, { message: 'Ad en az 3 karakter olmalıdır' })
  @MaxLength(50, { message: 'Ad en fazla 50 karakter olmalıdır' })
  name: string;

  @IsNotEmpty({ message: 'Soyad alanı zorunludur' })
  @IsString()
  @MinLength(3, { message: 'Soyad en az 3 karakter olmalıdır' })
  @MaxLength(50, { message: 'Soyad en fazla 50 karakter olmalıdır' })
  lastname: string;

  @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @IsNotEmpty({ message: 'Şifre alanı zorunludur' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password: string;

  @IsNotEmpty({ message: 'Şifre onayı alanı zorunludur' })
  @IsString()
  passwordConfirmation: string;

  @IsNotEmpty({ message: 'Telefon alanı zorunludur' })
  @IsString()
  phone: string;


  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsString()
  profilePicUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Not: address alanı kaldırıldı, sadece deliveryAddress kullanılacak

  // Multi-tenant yapı için tenant ID
  @IsOptional()
  @IsString()
  tenantId?: string;
}