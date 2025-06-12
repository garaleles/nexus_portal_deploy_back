import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { PackageType, SupportPriority, SupportStatus } from '../entities/support.entity';

export class CreateSupportDto {
  @IsEnum(PackageType)
  @IsNotEmpty()
  packageType: PackageType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority = SupportPriority.MEDIUM;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean = false;

  @IsString()
  @IsOptional()
  attachmentUrl?: string; // İlk mesaj için attachment
}

export class UpdateSupportDto {
  @IsEnum(SupportStatus)
  @IsOptional()
  status?: SupportStatus;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @IsString()
  @IsOptional()
  assignedToAdmin?: string;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;
}

export class CreateSupportMessageDto {
  @IsUUID()
  @IsNotEmpty()
  supportId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;
}

export class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}

export class SupportFilterDto {
  @IsEnum(SupportStatus)
  @IsOptional()
  status?: SupportStatus;

  @IsEnum(PackageType)
  @IsOptional()
  packageType?: PackageType;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  assignedToAdmin?: string;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
} 