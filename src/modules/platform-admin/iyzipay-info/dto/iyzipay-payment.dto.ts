import { IsString, IsNumber, IsEmail, IsObject, IsOptional, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentCardDto {
  @IsString()
  cardHolderName: string;

  @IsString()
  cardNumber: string;

  @IsString()
  expireMonth: string;

  @IsString()
  expireYear: string;

  @IsString()
  cvc: string;

  @IsOptional()
  @IsNumber()
  registerCard?: number;
}

export class BuyerDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  surname: string;

  @IsOptional()
  @IsString()
  gsmNumber?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  registrationDate?: string;

  @IsOptional()
  @IsString()
  lastLoginDate?: string;

  @IsOptional()
  @IsString()
  registrationAddress?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class AddressDto {
  @IsString()
  contactName: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class BasketItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  category1: string;

  @IsOptional()
  @IsString()
  category2?: string;

  @IsString()
  itemType: string; // PHYSICAL, VIRTUAL

  @IsNumber()
  @Min(0)
  price: number;
}

export class ThreedsInitializeRequestDto {
  @IsString()
  conversationId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  paidPrice: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsNumber()
  installment?: number;

  @IsString()
  basketId: string;

  @IsString()
  paymentChannel: string;

  @IsString()
  paymentGroup: string;

  @IsString()
  callbackUrl: string; // 3DS için callback URL

  @ValidateNested()
  @Type(() => PaymentCardDto)
  paymentCard: PaymentCardDto;

  @ValidateNested()
  @Type(() => BuyerDto)
  buyer: BuyerDto;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasketItemDto)
  basketItems: BasketItemDto[];
}

export class ThreedsCompleteRequestDto {
  @IsString()
  conversationId: string;

  @IsString()
  paymentId: string;

  @IsOptional()
  @IsString()
  conversationData?: string;
}

export class PaymentRequestDto {
  @IsString()
  conversationId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  paidPrice: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsNumber()
  installment?: number;

  @IsString()
  basketId: string;

  @IsString()
  paymentChannel: string;

  @IsString()
  paymentGroup: string;

  @ValidateNested()
  @Type(() => PaymentCardDto)
  paymentCard: PaymentCardDto;

  @ValidateNested()
  @Type(() => BuyerDto)
  buyer: BuyerDto;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasketItemDto)
  basketItems: BasketItemDto[];
}

export class InstallmentInfoRequestDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  binNumber: string;
} 