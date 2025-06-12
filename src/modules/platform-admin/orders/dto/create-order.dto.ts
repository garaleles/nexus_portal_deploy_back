import { IsString, IsEnum, IsEmail, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  subscriptionPlanId?: string; // Satın alınan subscription plan
}

export class CreateOrderDto {
  @IsString()
  orderNumber: string;

  // Müşteri Bilgileri
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  // Sektör Bilgisi
  @IsOptional()
  @IsString()
  industryId?: string;

  // Adres Bilgileri
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  // Sipariş Kalemleri
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];

  // Ödeme Bilgileri
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  paymentResult?: {
    id?: string;
    status?: string;
    update_time?: string;
    email_address?: string;
  };

  // Fiyat Bilgileri
  @IsNumber()
  taxPrice: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  total: number;

  // Durum Bilgileri
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
  isDelivered?: boolean;

  @IsOptional()
  deliveredAt?: Date;

  // Ek Bilgiler
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
} 