import { PartialType } from '@nestjs/mapped-types';
import { CreateCorporatePageDto } from './create-corporate-page.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { CorporatePageType } from '../entities/corporate-page.entity';

export class UpdateCorporatePageDto extends PartialType(CreateCorporatePageDto) {
  @IsOptional()
  @IsEnum(CorporatePageType)
  type?: CorporatePageType;
} 