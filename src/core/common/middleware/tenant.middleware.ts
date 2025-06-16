import { Injectable, NestMiddleware, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../../modules/platform-admin/tenants/entities/tenant.entity';
import { TenantMetadata } from '../../../modules/platform-admin/tenants/entities/tenant-metadata.entity';
import * as jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenant?: Tenant;
  tenantId?: string; // UUID formatında
  userId?: string; // JWT'dan gelen user ID
  isValidTenantUser?: boolean; // Kullanıcının bu tenant'a ait olup olmadığı
  user?: any; // Keycloak'tan gelen kullanıcı bilgileri
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantMetadata)
    private readonly tenantMetadataRepository: Repository<TenantMetadata>,
  ) { }

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Public endpoint ve platform endpoint kontrolü
      if (req.url.includes('/api/public/') ||
        req.url.includes('/api/health') ||
        req.url.includes('/health') ||
        req.url === '/' ||
        req.url.includes('/api/platform-admin/')) {
        this.logger.log('🌐 PLATFORM_ENDPOINT - Tenant kontrolü bypass ediliyor');
        return next();
      }

      // Backend URL'si kendisine istek atıyorsa bypass et
      const hostHeader = req.headers.host;
      if (hostHeader && (hostHeader.includes('business-portal-backend') || hostHeader.includes('backend'))) {
        this.logger.log('🔧 BACKEND_SELF_REQUEST - Tenant kontrolü bypass ediliyor');
        return next();
      }

      let tenant: Tenant | null = null;
      let userId: string | null = null;
      let isValidTenantUser = false;

      // JWT token'dan kullanıcı ID'sini al
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // JWT token'ı decode et (verify olmadan, sadece payload'ı al)
          const decoded = jwt.decode(token) as any;
          if (decoded && decoded.sub) {
            userId = decoded.sub;
            this.logger.log(`🔑 JWT'dan kullanıcı ID'si alındı: ${userId}`);
          }
        } catch (error) {
          this.logger.warn(`⚠️ JWT decode hatası: ${error.message}`);
        }
      }

      // 1. Platform kullanıcısı kontrolü
      const isPlatformUser = req.headers['x-platform-user'] === 'true';

      // 2. Header'dan tenant ID'sini kontrol et (bu aslında metadata ID'si)
      const tenantMetadataIdFromHeader = req.headers['x-tenant-id'] as string;

      // 3. Subdomain'den tenant'ı kontrol et (backward compatibility)
      let tenantSlugFromSubdomain: string | null = null;

      if (hostHeader) {
        const hostParts = hostHeader.split('.');
        if (hostParts.length > 2) {
          tenantSlugFromSubdomain = hostParts[0];
        }
      }

      // 4. Query parameter'dan tenant'ı kontrol et (backward compatibility)
      const tenantSlugFromQuery = req.query.tenant as string;

      this.logger.log(`🏢 TENANT_MIDDLEWARE - Request: ${req.method} ${req.url}`);

      // Support endpoint'leri için özel logging
      if (req.url.includes('/support/')) {
        this.logger.log(`🎫 SUPPORT_REQUEST - Headers:`, {
          'x-tenant-id': req.headers['x-tenant-id'],
          'authorization': req.headers.authorization ? 'Bearer ***' : 'YOK'
        });
      }
      this.logger.log(`🔍 TENANT_MIDDLEWARE - Tenant Sources:`, {
        isPlatformUser: isPlatformUser,
        tenantMetadataId: tenantMetadataIdFromHeader,
        subdomain: tenantSlugFromSubdomain,
        query: tenantSlugFromQuery,
        userId: userId
      });

      // Platform kullanıcısı kontrolü - tenant gerektirmeyen işlemler
      if (isPlatformUser) {
        this.logger.log(`👑 TENANT_MIDDLEWARE - Platform kullanıcısı tespit edildi`);
        // Platform kullanıcıları için tenant zorunlu değil
        // Request'e bilgi ekle ve devam et
        req.tenant = undefined;
        req.tenantId = undefined;
        req.userId = userId || undefined;
        req.isValidTenantUser = false; // Platform kullanıcısı olduğu için tenant ilişkisi yok

        this.logger.log(`📝 TENANT_MIDDLEWARE - Platform kullanıcısı için request bilgileri eklendi`);
        return next();
      }

      // Önce metadata ID ile ara, sonra slug ile (backward compatibility)
      if (tenantMetadataIdFromHeader) {
        this.logger.log(`🔍 TENANT_MIDDLEWARE - Tenant Metadata ID bulundu: ${tenantMetadataIdFromHeader}`);

        // Tenant_metadata ID'si ile tenant'ı bul
        tenant = await this.tenantRepository.findOne({
          where: { metadataId: tenantMetadataIdFromHeader },
          relations: ['metadata'],
        });

        if (!tenant) {
          this.logger.error(`❌ TENANT_MIDDLEWARE - Tenant Metadata ID '${tenantMetadataIdFromHeader}' ile tenant bulunamadı`);
          throw new BadRequestException(`Tenant bulunamadı`);
        }

        // Eğer JWT'dan userId varsa, bu kullanıcının bu tenant'a ait olup olmadığını kontrol et
        if (userId) {
          const tenantMetadata = await this.tenantMetadataRepository.findOne({
            where: {
              id: tenantMetadataIdFromHeader,
              keycloakId: userId // JWT'daki user ID ile tenant metadata'daki keycloakId eşleşmeli
            }
          });

          if (tenantMetadata) {
            isValidTenantUser = true;
            this.logger.log(`✅ TENANT_MIDDLEWARE - Kullanıcı doğrulandı: ${userId} tenant'a ait`);
          } else {
            this.logger.error(`❌ TENANT_MIDDLEWARE - Kullanıcı ${userId} bu tenant'a (${tenantMetadataIdFromHeader}) ait değil`);
            // Support endpoint'leri için bu gerekli, diğerleri için opsiyonel olabilir
            if (req.url.includes('/api/support/')) {
              throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
            }
          }
        }
      } else if (tenantSlugFromSubdomain || tenantSlugFromQuery) {
        // Backward compatibility için slug ile arama
        const tenantSlug = tenantSlugFromSubdomain || tenantSlugFromQuery;
        this.logger.log(`🔍 TENANT_MIDDLEWARE - Tenant slug bulundu (backward compatibility): ${tenantSlug}`);

        tenant = await this.tenantRepository.findOne({
          where: { slug: tenantSlug },
          relations: ['metadata'],
        });

        if (!tenant) {
          this.logger.error(`❌ TENANT_MIDDLEWARE - Tenant slug '${tenantSlug}' veritabanında bulunamadı`);
          throw new BadRequestException(`Tenant '${tenantSlug}' bulunamadı`);
        }

        // Slug ile geldiğinde de kullanıcı kontrolü yap
        if (userId && tenant.metadata) {
          if (tenant.metadata.keycloakId === userId) {
            isValidTenantUser = true;
            this.logger.log(`✅ TENANT_MIDDLEWARE - Kullanıcı slug ile doğrulandı: ${userId}`);
          } else {
            this.logger.error(`❌ TENANT_MIDDLEWARE - Kullanıcı ${userId} bu tenant'a (${tenantSlug}) ait değil`);
            if (req.url.includes('/api/support/')) {
              throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
            }
          }
        }
      } else {
        this.logger.warn(`⚠️ TENANT_MIDDLEWARE - Hiçbir kaynaktan tenant bilgisi bulunamadı`);

        // Platform kullanıcıları için platform admin endpoint'lerini kontrol et
        if (userId && (req.url.includes('/api/platform-admin/') || req.url.includes('/api/auth/profile'))) {
          this.logger.log(`👑 TENANT_MIDDLEWARE - Platform kullanıcısı için tenant ID gerekmiyor: ${req.url}`);
          // Platform kullanıcıları için tenant gereksinimleri esnetilir
        }
      }

      if (tenant) {
        if (!tenant.isActive()) {
          this.logger.error(`❌ TENANT_MIDDLEWARE - Tenant '${tenant.id}' aktif değil. Status: ${tenant.status}`);
          throw new BadRequestException(`Tenant '${tenant.name}' aktif değil`);
        }

        this.logger.log(`✅ TENANT_MIDDLEWARE - Tenant başarıyla bulundu:`, {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          metadataId: tenant.metadataId,
          isValidUser: isValidTenantUser
        });
      }

      // Tenant bilgilerini request'e ekle
      req.tenant = tenant || undefined;
      req.tenantId = tenant?.id; // Ana tenant ID'sini request'e ekle
      req.userId = userId || undefined;
      req.isValidTenantUser = isValidTenantUser;

      this.logger.log(`📝 TENANT_MIDDLEWARE - Request'e eklenen bilgiler:`, {
        tenantExists: !!req.tenant,
        tenantId: req.tenantId,
        tenantMetadataId: tenant?.metadataId,
        userId: req.userId,
        isValidTenantUser: req.isValidTenantUser
      });

      next();
    } catch (error) {
      this.logger.error(`🚨 TENANT_MIDDLEWARE - Hata:`, error.message);
      next(error);
    }
  }
} 