import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformUserRole, PlatformUserStatus } from '../entities/platform-user.entity';

export class CreatePlatformUserDto {
  @ApiProperty({ description: 'Kullanıcı adı', example: 'Ahmet' })
  @IsNotEmpty({ message: 'Ad alanı zorunludur' })
  @IsString({ message: 'Ad alanı metin olmalıdır' })
  name: string;

  @ApiProperty({ description: 'Kullanıcı soyadı', example: 'Yılmaz' })
  @IsNotEmpty({ message: 'Soyad alanı zorunludur' })
  @IsString({ message: 'Soyad alanı metin olmalıdır' })
  lastName: string;

  @ApiProperty({ description: 'E-posta adresi', example: 'ahmet.yilmaz@example.com' })
  @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @ApiProperty({
    description: 'Şifre (en az 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam içermeli)',
    example: 'P@ssw0rd123'
  })
  @IsNotEmpty({ message: 'Şifre alanı zorunludur' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Şifre en az 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'Kullanıcı rolü',
    enum: PlatformUserRole,
    default: PlatformUserRole.PLATFORM_ADMIN
  })
  @IsOptional()
  @IsEnum(PlatformUserRole, { message: 'Geçerli bir rol seçiniz' })
  role?: PlatformUserRole;

  @ApiPropertyOptional({
    description: 'Kullanıcı durumu',
    enum: PlatformUserStatus,
    default: PlatformUserStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(PlatformUserStatus, { message: 'Geçerli bir durum seçiniz' })
  status?: PlatformUserStatus;

  @ApiPropertyOptional({ description: 'Telefon numarası', example: '+905321234567' })
  @IsOptional()
  @IsString({ message: 'Telefon numarası metin olmalıdır' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Şirket adı', example: 'ABC Teknoloji Ltd.' })
  @IsOptional()
  @IsString({ message: 'Şirket adı metin olmalıdır' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Profil resmi URL', example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString({ message: 'Profil resmi URL metin olmalıdır' })
  profilePicUrl?: string;

  @ApiPropertyOptional({
    description: 'Kullanıcı izinleri (JSON formatında)',
    example: { canManageUsers: true, canManageTenants: false }
  })
  @IsOptional()
  permissions?: object;
}
