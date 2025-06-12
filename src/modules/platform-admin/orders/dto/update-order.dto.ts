import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  paidAt?: Date;

  @IsOptional()
  @IsBoolean()
  isTenantProvisioned?: boolean;

  @IsOptional()
  tenantProvisionedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  paymentResult?: {
    id?: string;
    status?: string;
    update_time?: string;
    email_address?: string;
  };

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  industryId?: string;
} 