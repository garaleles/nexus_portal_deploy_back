import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantMetadata } from '../platform-admin/tenants/entities/tenant-metadata.entity';

@Controller('public/tenant-metadata')
export class PublicTenantMetadataController {
  constructor(
    @InjectRepository(TenantMetadata)
    private metadataRepository: Repository<TenantMetadata>,
  ) { }

  /**
 * Keycloak ID ile tenant metadata getir
 */
  @Get('by-keycloak/:keycloakId')
  async getByKeycloakId(@Param('keycloakId') keycloakId: string): Promise<TenantMetadata> {
    console.log('🔍 PUBLIC-TENANT-METADATA - Searching for keycloakId:', keycloakId);

    const metadata = await this.metadataRepository.findOne({
      where: { keycloakId },
      relations: ['subscriptionPlan']
    });

    console.log('📋 PUBLIC-TENANT-METADATA - Found metadata:', metadata ? 'YES' : 'NO');
    if (metadata) {
      console.log('✅ PUBLIC-TENANT-METADATA - Metadata keys:', Object.keys(metadata));
      console.log('🏢 PUBLIC-TENANT-METADATA - Company name:', metadata.companyName);
      console.log('👤 PUBLIC-TENANT-METADATA - First name:', metadata.firstName);
      console.log('👤 PUBLIC-TENANT-METADATA - Last name:', metadata.lastName);
      console.log('📧 PUBLIC-TENANT-METADATA - Email:', metadata.email);
      console.log('📞 PUBLIC-TENANT-METADATA - Phone:', metadata.phone);
      console.log('🏭 PUBLIC-TENANT-METADATA - Industry ID:', metadata.industryId);
    }

    if (!metadata) {
      throw new NotFoundException('Bu Keycloak ID için tenant metadata bulunamadı');
    }

    return metadata;
  }

  /**
   * Tenant ID ile tenant metadata getir
   */
  @Get('by-tenant-id/:tenantId')
  async getByTenantId(@Param('tenantId') tenantId: string): Promise<TenantMetadata> {
    console.log('🔍 PUBLIC-TENANT-METADATA - Searching for tenantId:', tenantId);

    const metadata = await this.metadataRepository.findOne({
      where: { id: tenantId },
      relations: ['subscriptionPlan']
    });

    console.log('📋 PUBLIC-TENANT-METADATA - Found metadata by tenantId:', metadata ? 'YES' : 'NO');
    if (metadata) {
      console.log('✅ PUBLIC-TENANT-METADATA - Metadata keys:', Object.keys(metadata));
      console.log('🏢 PUBLIC-TENANT-METADATA - Company name:', metadata.companyName);
      console.log('👤 PUBLIC-TENANT-METADATA - First name:', metadata.firstName);
      console.log('👤 PUBLIC-TENANT-METADATA - Last name:', metadata.lastName);
      console.log('📧 PUBLIC-TENANT-METADATA - Email:', metadata.email);
      console.log('📞 PUBLIC-TENANT-METADATA - Phone:', metadata.phone);
      console.log('🏭 PUBLIC-TENANT-METADATA - Industry ID:', metadata.industryId);
    }

    if (!metadata) {
      throw new NotFoundException('Bu Tenant ID için metadata bulunamadı');
    }

    return metadata;
  }
} 