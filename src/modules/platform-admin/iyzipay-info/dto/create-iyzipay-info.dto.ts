import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, ValidateNested, IsUrl, IsIn, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentOptionDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  count: number;

  @IsNumber()
  @Min(0)
  minAmount: number;

  @IsNumber()
  @Min(0)
  maxAmount: number;
}

export class CreateIyzipayInfoDto {
  @IsString()
  @Length(2, 100, { message: 'Konfigürasyon adı 2-100 karakter arasında olmalıdır' })
  name: string;

  @IsString()
  @Length(1, 500, { message: 'API Key 1-500 karakter arasında olmalıdır' })
  apiKey: string;

  @IsString()
  @Length(1, 500, { message: 'Secret Key 1-500 karakter arasında olmalıdır' })
  secretKey: string;

  @IsOptional()
  @IsUrl()
  baseUrl?: string = 'https://sandbox-api.iyzipay.com';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  installment?: number = 1;

  @IsOptional()
  @IsBoolean()
  isTestMode?: boolean = true;

  @IsOptional()
  @IsString()
  @IsIn(['TRY', 'USD', 'EUR'])
  currency?: string = 'TRY';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentOptionDto)
  installmentOptions?: InstallmentOptionDto[] = [];
} 