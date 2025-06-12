import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateIndustryDto {
  @IsOptional()
  @IsString({ message: 'Sektör adı string olmalıdır' })
  @Length(2, 255, { message: 'Sektör adı 2-255 karakter arasında olmalıdır' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Açıklama string olmalıdır' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'Aktiflik durumu boolean olmalıdır' })
  isActive?: boolean;
}
