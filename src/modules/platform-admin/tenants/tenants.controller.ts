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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantMetadata, TenantStatus } from './entities/tenant-metadata.entity';
import { Tenant } from './entities/tenant.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@Controller('platform-admin/tenants')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  // Auth'sız test endpoint'i
  @Get('health')
  health() {
    return { status: 'OK', message: 'Tenants endpoint çalışıyor!' };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findAll(): Promise<Tenant[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findOne(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findOne(id);
  }

  @Get('slug/:slug')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findBySlug(@Param('slug') slug: string): Promise<Tenant> {
    return this.tenantsService.findBySlug(slug);
  }

  @Patch(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Patch(':id/status')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TenantStatus,
    @Body('reason') reason?: string,
  ): Promise<Tenant> {
    return this.tenantsService.updateStatus(id, status, reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(PlatformUserRole.SUPER_ADMIN)
  remove(@Param('id') id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }

  @Get(':id/debug-keycloak')
  @UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  debugKeycloakUser(@Param('id') id: string) {
    return this.tenantsService.debugKeycloakUser(id);
  }

  @Patch(':id/fix-keycloak')
  @UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  fixKeycloakUser(@Param('id') id: string) {
    return this.tenantsService.fixKeycloakUser(id);
  }
}
