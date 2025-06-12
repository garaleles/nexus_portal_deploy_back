import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailConfigDto {
  @ApiProperty({ description: 'SMTP sunucu adresi' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'SMTP sunucu portu', example: 587 })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Güvenli bağlantı kullanılsın mı?', example: false })
  @IsBoolean()
  secure: boolean;

  @ApiProperty({ description: 'SMTP kullanıcı adı / e-posta adresi' })
  @IsString()
  user: string;

  @ApiProperty({ description: 'SMTP şifresi' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'E-posta gönderici adı', example: 'Business Portal' })
  @IsString()
  fromName: string;

  @ApiProperty({ description: 'E-posta gönderici adresi' })
  @IsEmail()
  fromAddress: string;

  @ApiProperty({ description: 'Frontend URL', example: 'http://localhost:3000' })
  @IsString()
  frontendUrl: string;
}

export class UpdateEmailConfigDto {
  @ApiPropertyOptional({ description: 'SMTP sunucu adresi' })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional({ description: 'SMTP sunucu portu', example: 587 })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: 'Güvenli bağlantı kullanılsın mı?', example: false })
  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @ApiPropertyOptional({ description: 'SMTP kullanıcı adı / e-posta adresi' })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ description: 'SMTP şifresi' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'E-posta gönderici adı', example: 'Business Portal' })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiPropertyOptional({ description: 'E-posta gönderici adresi' })
  @IsEmail()
  @IsOptional()
  fromAddress?: string;

  @ApiPropertyOptional({ description: 'Frontend URL', example: 'http://localhost:3000' })
  @IsString()
  @IsOptional()
  frontendUrl?: string;

  @ApiPropertyOptional({ description: 'Aktif mi?', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class EmailConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  host: string;

  @ApiProperty()
  port: number;

  @ApiProperty()
  secure: boolean;

  @ApiProperty()
  user: string;

  @ApiProperty()
  fromName: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  frontendUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Password alanı response'da gösterilmez (güvenlik)
}
