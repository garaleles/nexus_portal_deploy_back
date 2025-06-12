import { IsOptional, IsEnum, IsBoolean, IsString, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, OrderStatus } from '../entities/order.entity';

export class OrderFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Sipariş numarası, müşteri adı veya e-posta için arama

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTenantProvisioned?: boolean;

  @IsOptional()
  @IsString()
  tenantProvisioningStatus?: 'pending' | 'provisioning' | 'completed' | 'failed';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minTotal?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxTotal?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
} 