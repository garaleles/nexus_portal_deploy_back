import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  NotFoundException,
  Logger,
  UseGuards
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../platform-admin/tenants/entities/tenant.entity';
import { TenantMetadata } from '../platform-admin/tenants/entities/tenant-metadata.entity';

export interface ServiceAuthGuard {
  canActivate(context: any): boolean;
}

/**
 * B2B servisleri için service token kontrolü yapan guard
 */
class ServiceTokenGuard implements ServiceAuthGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Service token bulunamadı');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);

      // Service token kontrolü
      if (payload.type !== 'service_token') {
        throw new UnauthorizedException('Geçersiz token türü');
      }

      request.serviceInfo = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Geçersiz service token');
    }
  }
}

@Controller('public/tenants')
export class PublicTenantsController {
  private readonly logger = new Logger(PublicTenantsController.name);
  private serviceGuard: ServiceTokenGuard;

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantMetadata)
    private metadataRepository: Repository<TenantMetadata>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.serviceGuard = new ServiceTokenGuard(jwtService, configService);
  }

  /**
   * B2B için belirli bir tenant'ın bilgilerini döner
   */
  @Get(':id')
  async getTenantForB2B(
    @Param('id') tenantId: string,
    @Headers('authorization') authHeader: string
  ) {
    // Service token kontrolü
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: authHeader } })
      })
    };

    if (!this.serviceGuard.canActivate(context)) {
      throw new UnauthorizedException('Service authentication gerekli');
    }

    this.logger.log(`B2B tenant bilgisi isteniyor: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['metadata', 'metadata.subscriptionPlan'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant bulunamadı: ${tenantId}`);
    }

    return {
      id: tenant.id,
      keycloak_user_id: tenant.keycloakId,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.metadata?.email,
      company_name: tenant.metadata?.companyName,
      subscription_status: tenant.metadata?.status,
      subscription_package: tenant.metadata?.subscriptionPlan?.name,
      subscription_plan_id: tenant.metadata?.subscriptionPlanId,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
      status: tenant.status,
      database_schema: tenant.databaseSchema,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
    };
  }

  /**
   * B2B sync için tüm tenant'ların bilgilerini döner
   */
  @Get('')
  async getAllTenantsForB2B(@Headers('authorization') authHeader: string) {
    // Service token kontrolü
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: authHeader } })
      })
    };

    if (!this.serviceGuard.canActivate(context)) {
      throw new UnauthorizedException('Service authentication gerekli');
    }

    this.logger.log('B2B için tüm tenant bilgileri isteniyor');

    const tenants = await this.tenantRepository.find({
      relations: ['metadata', 'metadata.subscriptionPlan'],
      order: { createdAt: 'DESC' },
    });

    return tenants.map(tenant => ({
      id: tenant.id,
      keycloak_user_id: tenant.keycloakId,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.metadata?.email,
      company_name: tenant.metadata?.companyName,
      subscription_status: tenant.metadata?.status,
      subscription_package: tenant.metadata?.subscriptionPlan?.name,
      subscription_plan_id: tenant.metadata?.subscriptionPlanId,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
      status: tenant.status,
      database_schema: tenant.databaseSchema,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
    }));
  }

  /**
   * B2B için tenant metadata bilgilerini döner
   */
  @Get(':id/metadata')
  async getTenantMetadata(
    @Param('id') tenantId: string,
    @Headers('authorization') authHeader: string
  ) {
    // Service token kontrolü
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: authHeader } })
      })
    };

    if (!this.serviceGuard.canActivate(context)) {
      throw new UnauthorizedException('Service authentication gerekli');
    }

    this.logger.log(`B2B tenant metadata isteniyor: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['metadata', 'metadata.subscriptionPlan'],
    });

    if (!tenant || !tenant.metadata) {
      throw new NotFoundException(`Tenant metadata bulunamadı: ${tenantId}`);
    }

    return {
      id: tenant.metadata.id,
      tenant_id: tenantId,
      name: tenant.metadata.name,
      slug: tenant.metadata.slug,
      email: tenant.metadata.email,
      phone: tenant.metadata.phone,
      address: tenant.metadata.address,
      city: tenant.metadata.city,
      district: tenant.metadata.district,
      company_name: tenant.metadata.companyName,
      first_name: tenant.metadata.firstName,
      last_name: tenant.metadata.lastName,
      tenant_type: tenant.metadata.tenantType,
      tax_number: tenant.metadata.taxNumber,
      tax_office: tenant.metadata.taxOffice,
      industry_id: tenant.metadata.industryId,
      subscription_plan_id: tenant.metadata.subscriptionPlanId,
      subscription_plan_name: tenant.metadata.subscriptionPlan?.name,
      subscription_duration: tenant.metadata.subscriptionDuration,
      subscription_start_date: tenant.metadata.subscriptionStartDate,
      subscription_end_date: tenant.metadata.subscriptionEndDate,
      payment_status: tenant.metadata.paymentStatus,
      logo_url: tenant.metadata.logoUrl,
      primary_color: tenant.metadata.primaryColor,
      secondary_color: tenant.metadata.secondaryColor,
      custom_domain: tenant.metadata.customDomain,
      user_quota: tenant.metadata.userQuota,
      active_user_count: tenant.metadata.activeUserCount,
      keycloak_id: tenant.metadata.keycloakId,
      admin_user_id: tenant.metadata.adminUserId,
      database_name: tenant.metadata.databaseName,
      database_connection_string: tenant.metadata.databaseConnectionString,
      status: tenant.metadata.status,
      suspension_reason: tenant.metadata.suspensionReason,
      created_at: tenant.metadata.createdAt,
      updated_at: tenant.metadata.updatedAt,
    };
  }
} 