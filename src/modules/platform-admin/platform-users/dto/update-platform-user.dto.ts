import { IsEmail, IsEnum, IsOptional, IsString, MinLength, Matches, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformUserRole, PlatformUserStatus } from '../entities/platform-user.entity';

export class UpdatePlatformUserDto {
  @ApiPropertyOptional({ description: 'Kullanıcı adı', example: 'Ahmet' })
  @IsOptional()
  @IsString({ message: 'Ad alanı metin olmalıdır' })
  name?: string;

  @ApiPropertyOptional({ description: 'Kullanıcı soyadı', example: 'Yılmaz' })
  @IsOptional()
  @IsString({ message: 'Soyad alanı metin olmalıdır' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'E-posta adresi', example: 'ahmet.yilmaz@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Şifre (en az 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam içermeli)',
    example: 'P@ssw0rd123'
  })
  @IsOptional()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: 'Şifre en az 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Kullanıcı rolü',
    enum: PlatformUserRole
  })
  @IsOptional()
  @IsEnum(PlatformUserRole, { message: 'Geçerli bir rol seçiniz' })
  role?: PlatformUserRole;

  @ApiPropertyOptional({
    description: 'Kullanıcı durumu',
    enum: PlatformUserStatus
  })
  @IsOptional()
  @IsEnum(PlatformUserStatus, { message: 'Geçerli bir durum seçiniz' })
  status?: PlatformUserStatus;

  @ApiPropertyOptional({ description: 'Aktif/Pasif durumu', example: true })
  @IsOptional()
  @IsBoolean({ message: 'Aktif/Pasif alanı boolean olmalıdır' })
  isActive?: boolean;

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
