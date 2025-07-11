import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString({ message: 'Plan adı string olmalıdır' })
  @Length(2, 100, { message: 'Plan adı 2-100 karakter arasında olmalıdır' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Plan kodu string olmalıdır' })
  @Length(2, 100, { message: 'Plan kodu 2-100 karakter arasında olmalıdır' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'Açıklama string olmalıdır' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Fiyat sayı olmalıdır' })
  @Min(0, { message: 'Fiyat en az 0 olmalıdır' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Kullanıcı kotası sayı olmalıdır' })
  @Min(1, { message: 'Kullanıcı kotası en az 1 olmalıdır' })
  userQuota?: number;

  @IsOptional()
  @IsString({ message: 'Fatura döngüsü string olmalıdır' })
  billingCycle?: string;

  @IsOptional()
  @IsBoolean({ message: 'Aktiflik durumu boolean olmalıdır' })
  isActive?: boolean;

  @IsOptional()
  @IsObject({ message: 'Özellikler bir nesne olmalıdır' })
  features?: Record<string, any>;
}
