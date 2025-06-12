import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EndpointsService } from '../services/endpoints.service';
import { CreateEndpointDto } from '../dto/create-endpoint.dto';
import { UpdateEndpointDto } from '../dto/update-endpoint.dto';
import { Endpoint, EndpointCategory } from '../entities/endpoint.entity';
import { KeycloakAuthGuard } from '../../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../../platform-users/entities/platform-user.entity';

@ApiTags('Endpoint Yönetimi')
@Controller('platform-admin/endpoints')
@ApiBearerAuth()
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@Roles(PlatformUserRole.SUPER_ADMIN)
export class EndpointsController {
  constructor(private readonly endpointsService: EndpointsService) { }

  @Post()
  @ApiOperation({ summary: 'Yeni endpoint oluştur' })
  @ApiResponse({ status: 201, description: 'Endpoint başarıyla oluşturuldu.', type: Endpoint })
  @ApiResponse({ status: 409, description: 'Endpoint zaten mevcut.' })
  create(@Body() createEndpointDto: CreateEndpointDto): Promise<Endpoint> {
    return this.endpointsService.create(createEndpointDto);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm endpoint\'leri listele' })
  @ApiResponse({ status: 200, description: 'Endpoint\'ler başarıyla getirildi.', type: [Endpoint] })
  findAll(): Promise<Endpoint[]> {
    return this.endpointsService.findAll();
  }

  @Get('by-category/:category')
  @ApiOperation({ summary: 'Kategoriye göre endpoint\'leri listele' })
  @ApiResponse({ status: 200, description: 'Kategori endpoint\'leri başarıyla getirildi.', type: [Endpoint] })
  findByCategory(@Param('category') category: EndpointCategory): Promise<Endpoint[]> {
    return this.endpointsService.findByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Endpoint detayını getir' })
  @ApiResponse({ status: 200, description: 'Endpoint detayı başarıyla getirildi.', type: Endpoint })
  @ApiResponse({ status: 404, description: 'Endpoint bulunamadı.' })
  findOne(@Param('id') id: string): Promise<Endpoint> {
    return this.endpointsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Endpoint güncelle' })
  @ApiResponse({ status: 200, description: 'Endpoint başarıyla güncellendi.', type: Endpoint })
  @ApiResponse({ status: 404, description: 'Endpoint bulunamadı.' })
  @ApiResponse({ status: 409, description: 'Endpoint çakışması.' })
  update(
    @Param('id') id: string,
    @Body() updateEndpointDto: UpdateEndpointDto,
  ): Promise<Endpoint> {
    return this.endpointsService.update(id, updateEndpointDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Endpoint sil' })
  @ApiResponse({ status: 204, description: 'Endpoint başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Endpoint bulunamadı.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.endpointsService.remove(id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint\'leri seed et' })
  @ApiResponse({ status: 200, description: 'Endpoint\'ler başarıyla seed edildi.' })
  async seedEndpoints(): Promise<{ message: string }> {
    await this.endpointsService.seedEndpoints();
    return { message: 'Endpoint\'ler başarıyla seed edildi' };
  }
} 