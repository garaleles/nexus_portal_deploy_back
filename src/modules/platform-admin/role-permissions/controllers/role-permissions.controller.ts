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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolePermissionsService } from '../services/role-permissions.service';
import { CreateRolePermissionDto, UpdateRolePermissionDto, BulkRolePermissionDto, RolePermissionResponseDto } from '../dto/role-permission.dto';
import { RolePermission } from '../entities/role-permission.entity';
import { KeycloakAuthGuard } from '../../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../../platform-users/entities/platform-user.entity';

@ApiTags('Rol İzinleri Yönetimi')
@Controller('platform-admin/role-permissions')
@ApiBearerAuth()
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@Roles(PlatformUserRole.SUPER_ADMIN)
export class RolePermissionsController {
  private readonly logger = new Logger(RolePermissionsController.name);

  constructor(private readonly rolePermissionsService: RolePermissionsService) { }

  @Post()
  @ApiOperation({ summary: 'Yeni rol izni oluştur' })
  @ApiResponse({ status: 201, description: 'Rol izni başarıyla oluşturuldu.', type: RolePermissionResponseDto })
  @ApiResponse({ status: 409, description: 'Rol izni zaten mevcut.' })
  create(@Body() createRolePermissionDto: CreateRolePermissionDto): Promise<RolePermission> {
    return this.rolePermissionsService.create(createRolePermissionDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Toplu rol izni oluştur' })
  @ApiResponse({ status: 201, description: 'Rol izinleri başarıyla oluşturuldu.', type: [RolePermissionResponseDto] })
  createBulk(@Body() bulkRolePermissionDto: BulkRolePermissionDto): Promise<RolePermission[]> {
    return this.rolePermissionsService.createBulk(bulkRolePermissionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm rol izinlerini listele' })
  @ApiResponse({ status: 200, description: 'Rol izinleri başarıyla getirildi.', type: [RolePermissionResponseDto] })
  findAll(): Promise<RolePermission[]> {
    return this.rolePermissionsService.findAll();
  }

  @Get('by-role/:role')
  @ApiOperation({ summary: 'Role göre izinleri listele' })
  @ApiResponse({ status: 200, description: 'Rol izinleri başarıyla getirildi.', type: [RolePermissionResponseDto] })
  findByRole(@Param('role') role: PlatformUserRole): Promise<RolePermission[]> {
    return this.rolePermissionsService.findByRole(role);
  }

  @Get('by-endpoint/:endpointId')
  @ApiOperation({ summary: 'Endpoint\'e göre izinleri listele' })
  @ApiResponse({ status: 200, description: 'Endpoint izinleri başarıyla getirildi.', type: [RolePermissionResponseDto] })
  findByEndpoint(@Param('endpointId') endpointId: string): Promise<RolePermission[]> {
    return this.rolePermissionsService.findByEndpoint(endpointId);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'İzin matrisini getir' })
  @ApiResponse({ status: 200, description: 'İzin matrisi başarıyla getirildi.' })
  getPermissionMatrix(): Promise<any> {
    return this.rolePermissionsService.getPermissionMatrix();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Rol izni detayını getir' })
  @ApiResponse({ status: 200, description: 'Rol izni detayı başarıyla getirildi.', type: RolePermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Rol izni bulunamadı.' })
  findOne(@Param('id') id: string): Promise<RolePermission> {
    return this.rolePermissionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rol izni güncelle' })
  @ApiResponse({ status: 200, description: 'Rol izni başarıyla güncellendi.', type: RolePermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Rol izni bulunamadı.' })
  async update(
    @Param('id') id: string,
    @Body() updateRolePermissionDto: UpdateRolePermissionDto,
  ): Promise<RolePermission> {
    try {
      this.logger.debug(`Rol izni güncelleme isteği - ID: ${id}`);
      this.logger.debug(`Gönderilen veri: ${JSON.stringify(updateRolePermissionDto)}`);

      const result = await this.rolePermissionsService.update(id, updateRolePermissionDto);

      this.logger.debug(`Rol izni başarıyla güncellendi - ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Rol izni güncelleme hatası - ID: ${id}, Hata: ${error.message}`);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rol izni sil' })
  @ApiResponse({ status: 204, description: 'Rol izni başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Rol izni bulunamadı.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.rolePermissionsService.remove(id);
  }

  @Delete('by-role/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Role ait tüm izinleri sil' })
  @ApiResponse({ status: 204, description: 'Rol izinleri başarıyla silindi.' })
  removeByRole(@Param('role') role: PlatformUserRole): Promise<void> {
    return this.rolePermissionsService.removeByRole(role);
  }

  @Delete('by-endpoint/:endpointId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Endpoint\'e ait tüm izinleri sil' })
  @ApiResponse({ status: 204, description: 'Endpoint izinleri başarıyla silindi.' })
  removeByEndpoint(@Param('endpointId') endpointId: string): Promise<void> {
    return this.rolePermissionsService.removeByEndpoint(endpointId);
  }

  @Post('seed-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Varsayılan rol izinlerini oluştur' })
  @ApiResponse({ status: 200, description: 'Varsayılan izinler başarıyla oluşturuldu.' })
  async seedDefaultPermissions(): Promise<{ message: string }> {
    await this.rolePermissionsService.seedDefaultPermissions();
    return { message: 'Varsayılan rol izinleri başarıyla oluşturuldu' };
  }

  @Post('check-permission')
  @ApiOperation({ summary: 'İzin kontrolü yap' })
  @ApiResponse({ status: 200, description: 'İzin kontrolü başarıyla yapıldı.' })
  async checkPermission(
    @Body() checkData: { role: PlatformUserRole; path: string; method: string }
  ): Promise<{ hasPermission: boolean }> {
    const hasPermission = await this.rolePermissionsService.checkPermission(
      checkData.role,
      checkData.path,
      checkData.method
    );
    return { hasPermission };
  }
} 