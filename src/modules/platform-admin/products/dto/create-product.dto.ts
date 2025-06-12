import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, IsBoolean, IsNumber, MinLength, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString({ message: 'Ürün kodu metin olmalıdır' })
  @IsNotEmpty({ message: 'Ürün kodu zorunludur' })
  @MinLength(2, { message: 'Ürün kodu en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Ürün kodu en fazla 100 karakter olmalıdır' })
  productCode: string;

  @IsString({ message: 'Ürün adı metin olmalıdır' })
  @IsNotEmpty({ message: 'Ürün adı zorunludur' })
  @MinLength(2, { message: 'Ürün adı en az 2 karakter olmalıdır' })
  @MaxLength(255, { message: 'Ürün adı en fazla 255 karakter olmalıdır' })
  name: string;

  @IsString({ message: 'Slug metin olmalıdır' })
  @IsOptional()
  @MaxLength(255, { message: 'Slug en fazla 255 karakter olmalıdır' })
  slug?: string;

  @IsString({ message: 'Açıklama metin olmalıdır' })
  @IsNotEmpty({ message: 'Açıklama zorunludur' })
  @MinLength(10, { message: 'Açıklama en az 10 karakter olmalıdır' })
  description: string;

  @IsUUID('4', { message: 'Geçerli bir abonelik planı ID\'si seçilmelidir' })
  @IsOptional()
  subscriptionPlanId?: string;

  @IsNumber({}, { message: 'Fiyat sayı olmalıdır' })
  @Min(0, { message: 'Fiyat 0\'dan küçük olamaz' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  price?: number;

  @IsBoolean({ message: 'Aktiflik durumu boolean olmalıdır' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean = true;

  @IsString({ message: 'Meta başlık metin olmalıdır' })
  @IsOptional()
  @MaxLength(255, { message: 'Meta başlık en fazla 255 karakter olmalıdır' })
  metaTitle?: string;

  @IsString({ message: 'Meta açıklama metin olmalıdır' })
  @IsOptional()
  @MaxLength(500, { message: 'Meta açıklama en fazla 500 karakter olmalıdır' })
  metaDescription?: string;

  @IsArray({ message: 'Etiketler array olmalıdır' })
  @IsOptional()
  @IsString({ each: true, message: 'Her etiket metin olmalıdır' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  tags?: string[];

  @IsUUID('4', { message: 'Geçerli bir kullanıcı ID\'si olmalıdır' })
  @IsOptional()
  createdBy?: string;
}

export class CreateProductImageDto {
  @IsString({ message: 'Alt text metin olmalıdır' })
  @IsOptional()
  @MaxLength(100, { message: 'Alt text en fazla 100 karakter olmalıdır' })
  altText?: string;

  @IsNumber({}, { message: 'Sıralama sayı olmalıdır' })
  @IsOptional()
  @Min(0, { message: 'Sıralama 0\'dan küçük olamaz' })
  @Transform(({ value }) => parseInt(value))
  sortOrder?: number = 0;

  @IsBoolean({ message: 'Ana resim durumu boolean olmalıdır' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  isPrimary?: boolean = false;
} 