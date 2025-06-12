import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto, CreateProductImageDto } from './create-product.dto';
import { IsUUID, IsOptional } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsUUID('4', { message: 'Geçerli bir kullanıcı ID\'si olmalıdır' })
  @IsOptional()
  updatedBy?: string;
}

export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {
  @IsUUID('4', { message: 'Geçerli bir resim ID\'si olmalıdır' })
  @IsOptional()
  id?: string;
} 