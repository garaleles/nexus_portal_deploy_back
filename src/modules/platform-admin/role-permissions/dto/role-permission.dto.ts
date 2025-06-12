import { IsEnum, IsUUID, IsBoolean, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformUserRole } from '../../platform-users/entities/platform-user.entity';

export class CreateRolePermissionDto {
  @ApiProperty({ description: 'Platform kullanıcı rolü', enum: PlatformUserRole })
  @IsEnum(PlatformUserRole)
  role: PlatformUserRole;

  @ApiProperty({ description: 'Endpoint ID' })
  @IsUUID()
  endpointId: string;

  @ApiPropertyOptional({ description: 'Okuma izni', default: true })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Yazma izni', default: false })
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional({ description: 'Silme izni', default: false })
  @IsOptional()
  @IsBoolean()
  canDelete?: boolean;

  @ApiPropertyOptional({ description: 'Aktif durumu', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notlar' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRolePermissionDto {
  @ApiPropertyOptional({ description: 'Okuma izni' })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Yazma izni' })
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional({ description: 'Silme izni' })
  @IsOptional()
  @IsBoolean()
  canDelete?: boolean;

  @ApiPropertyOptional({ description: 'Aktif durumu' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notlar' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkRolePermissionDto {
  @ApiProperty({ description: 'Platform kullanıcı rolü', enum: PlatformUserRole })
  @IsEnum(PlatformUserRole)
  role: PlatformUserRole;

  @ApiProperty({ description: 'Endpoint ID\'leri', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  endpointIds: string[];

  @ApiPropertyOptional({ description: 'Okuma izni', default: true })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Yazma izni', default: false })
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional({ description: 'Silme izni', default: false })
  @IsOptional()
  @IsBoolean()
  canDelete?: boolean;
}

export class RolePermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PlatformUserRole })
  role: PlatformUserRole;

  @ApiProperty()
  endpointId: string;

  @ApiProperty()
  canRead: boolean;

  @ApiProperty()
  canWrite: boolean;

  @ApiProperty()
  canDelete: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
} 