import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EndpointMethod, EndpointCategory } from '../entities/endpoint.entity';

export class CreateEndpointDto {
  @ApiProperty({ description: 'Endpoint yolu', example: '/platform-admin/tenants' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'HTTP method', enum: EndpointMethod })
  @IsEnum(EndpointMethod)
  method: EndpointMethod;

  @ApiProperty({ description: 'Controller adı', example: 'TenantsController' })
  @IsString()
  controllerName: string;

  @ApiProperty({ description: 'Action adı', example: 'findAll' })
  @IsString()
  actionName: string;

  @ApiProperty({ description: 'Endpoint açıklaması', example: 'Tüm tenant\'ları listele' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Endpoint kategorisi', enum: EndpointCategory })
  @IsEnum(EndpointCategory)
  category: EndpointCategory;

  @ApiPropertyOptional({ description: 'Aktif durumu', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Kimlik doğrulama gereksinimi', default: false })
  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @ApiPropertyOptional({ description: 'Tenant\'a özel endpoint mi', default: false })
  @IsOptional()
  @IsBoolean()
  isTenantSpecific?: boolean;
} 