import { IsEnum, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { CorporatePageType } from '../entities/corporate-page.entity';

export class CreateCorporatePageDto {
  @IsEnum(CorporatePageType)
  type: CorporatePageType;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
} 