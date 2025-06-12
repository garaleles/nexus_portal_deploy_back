import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CorporatePagesService } from './corporate-pages.service';
import { CreateCorporatePageDto } from './dto/create-corporate-page.dto';
import { UpdateCorporatePageDto } from './dto/update-corporate-page.dto';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@ApiTags('Kurumsal Sayfa Yönetimi')
@Controller('platform-admin/corporate-pages')
@ApiBearerAuth()
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class CorporatePagesController {
  constructor(private readonly corporatePagesService: CorporatePagesService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Kurumsal sayfa oluştur' })
  @ApiResponse({ status: 201, description: 'Kurumsal sayfa başarıyla oluşturuldu.' })
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.CONTENT_MANAGER)
  create(@Body() createCorporatePageDto: CreateCorporatePageDto) {
    return this.corporatePagesService.create(createCorporatePageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Kurumsal sayfaları listele' })
  @ApiResponse({ status: 200, description: 'Kurumsal sayfalar başarıyla listelendi.' })
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.CONTENT_MANAGER, PlatformUserRole.SUPPORT_AGENT)
  findAll() {
    return this.corporatePagesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kurumsal sayfa detayını getir' })
  @ApiResponse({ status: 200, description: 'Kurumsal sayfa detayı başarıyla getirildi.' })
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.CONTENT_MANAGER, PlatformUserRole.SUPPORT_AGENT)
  findOne(@Param('id') id: string) {
    return this.corporatePagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kurumsal sayfayı güncelle' })
  @ApiResponse({ status: 200, description: 'Kurumsal sayfa başarıyla güncellendi.' })
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.CONTENT_MANAGER)
  update(@Param('id') id: string, @Body() updateCorporatePageDto: UpdateCorporatePageDto) {
    return this.corporatePagesService.update(id, updateCorporatePageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Kurumsal sayfayı sil' })
  @ApiResponse({ status: 204, description: 'Kurumsal sayfa başarıyla silindi.' })
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  remove(@Param('id') id: string) {
    return this.corporatePagesService.remove(id);
  }

  @Post('initialize-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Varsayılan kurumsal sayfaları oluştur' })
  @ApiResponse({ status: 200, description: 'Varsayılan kurumsal sayfalar başarıyla oluşturuldu.' })
  @Roles(PlatformUserRole.SUPER_ADMIN)
  initializeDefaults() {
    return this.corporatePagesService.initializeDefaultPages();
  }
} 