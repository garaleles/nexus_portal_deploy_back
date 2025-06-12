import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { TenantMetadata, TenantStatus } from '../platform-admin/tenants/entities/tenant-metadata.entity';
import { Tenant } from '../platform-admin/tenants/entities/tenant.entity';
import { KeycloakService } from '../../core/auth/services/keycloak.service';
import {
  TenantLoginDto,
  TenantHistoryCheckDto,
  TenantProfileResponseDto,
  TenantLoginResponseDto,
  TenantHistoryResponseDto
} from './dto/tenant-auth.dto';

@Injectable()
export class PublicTenantAuthService {
  private readonly logger = new Logger(PublicTenantAuthService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantMetadata)
    private metadataRepository: Repository<TenantMetadata>,
    private jwtService: JwtService,
    private keycloakService: KeycloakService,
  ) { }

  /**
   * Tenant login - Keycloak ile entegre
   */
  async login(loginDto: TenantLoginDto): Promise<TenantLoginResponseDto> {
    try {
      this.logger.log(`Tenant login attempt for email: ${loginDto.email}`);

      // Önce bu email ile bir tenant olup olmadığını kontrol et
      const tenant = await this.findTenantByEmail(loginDto.email);

      if (!tenant) {
        this.logger.warn(`Tenant not found for email: ${loginDto.email}`);
        throw new UnauthorizedException('Geçersiz e-posta veya şifre');
      }

      // Tenant aktif mi kontrol et
      if (tenant.status !== TenantStatus.ACTIVE || tenant.metadata.status !== TenantStatus.ACTIVE) {
        this.logger.warn(`Inactive tenant login attempt: ${loginDto.email}`);
        throw new UnauthorizedException('Hesabınız aktif değil. Lütfen yöneticinizle iletişime geçin.');
      }

      // Keycloak ile authentication
      const keycloakToken = await this.authenticateWithKeycloak(loginDto.email, loginDto.password);

      if (!keycloakToken) {
        this.logger.warn(`Keycloak authentication failed for: ${loginDto.email}`);
        throw new UnauthorizedException('Geçersiz e-posta veya şifre');
      }

      // JWT token oluştur
      const token = await this.generateJwtToken(tenant);

      // Profile bilgilerini oluştur
      const profile = this.mapTenantToProfile(tenant);

      this.logger.log(`Successful tenant login: ${loginDto.email}`);

      return {
        success: true,
        message: `Hoş geldiniz, ${profile.companyName || profile.name}!`,
        token,
        profile
      };

    } catch (error) {
      this.logger.error(`Tenant login error for ${loginDto.email}:`, error.message);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Giriş yapılırken hata oluştu');
    }
  }

  /**
   * Email ile tenant'ın geçmişte sipariş verip vermediğini kontrol et
   */
  async checkTenantHistory(historyDto: TenantHistoryCheckDto): Promise<TenantHistoryResponseDto> {
    try {
      this.logger.log(`Checking tenant history for email: ${historyDto.email}`);

      const tenant = await this.findTenantByEmail(historyDto.email);

      if (!tenant) {
        return {
          hasHistory: false,
          message: 'Bu e-posta adresi ile daha önce alışveriş yapmamışsınız. Misafir olarak devam edebilirsiniz.'
        };
      }

      // TODO: Order tablosundan gerçek sipariş geçmişi kontrolü
      // Şimdilik tenant varlığı = sipariş geçmişi var olarak kabul ediyoruz

      const profile = this.mapTenantToProfile(tenant);

      return {
        hasHistory: true,
        message: 'Bu e-posta adresi ile daha önce alışveriş yaptığınızı görüyoruz. Lütfen giriş yapın.',
        profile
      };

    } catch (error) {
      this.logger.error(`Tenant history check error for ${historyDto.email}:`, error.message);

      return {
        hasHistory: false,
        message: 'Geçmiş kontrol edilirken hata oluştu. Misafir olarak devam edebilirsiniz.'
      };
    }
  }

  /**
   * Email ile tenant bulma
   */
  private async findTenantByEmail(email: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: {
        metadata: {
          email: email
        }
      },
      relations: ['metadata']
    });
  }

  /**
   * Keycloak ile authentication
   */
  private async authenticateWithKeycloak(email: string, password: string): Promise<string | null> {
    try {
      // TODO: Gerçek Keycloak authentication implementasyonu
      // Şimdilik mock implementasyon
      this.logger.log(`Mock Keycloak authentication for: ${email}`);

      // Mock response - gerçek implementasyonda Keycloak'tan gelecek
      if (password === 'password123' || password.length >= 6) {
        return 'mock-keycloak-token';
      }

      return null;
    } catch (error) {
      this.logger.error('Keycloak authentication error:', error.message);
      return null;
    }
  }

  /**
   * JWT token oluşturma
   */
  private async generateJwtToken(tenant: Tenant): Promise<string> {
    const payload = {
      sub: tenant.id,
      email: tenant.metadata.email,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      type: 'tenant'
    };

    return this.jwtService.sign(payload, {
      expiresIn: '24h'
    });
  }

  /**
   * Tenant'ı profile formatına dönüştürme
   */
  private mapTenantToProfile(tenant: Tenant): TenantProfileResponseDto {
    return {
      id: tenant.id,
      name: tenant.metadata.name,
      slug: tenant.slug,
      email: tenant.metadata.email,
      companyName: tenant.metadata.companyName || tenant.metadata.name,
      firstName: tenant.metadata.firstName,
      lastName: tenant.metadata.lastName,
      phone: tenant.metadata.phone,
      address: tenant.metadata.address,
      city: tenant.metadata.city,
      district: tenant.metadata.district,
      taxNumber: tenant.metadata.taxNumber,
      taxOffice: tenant.metadata.taxOffice,
      industryId: tenant.metadata.industryId
    };
  }

  /**
   * JWT token'ı verify etme
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.error('JWT token verification error:', error.message);
      throw new UnauthorizedException('Geçersiz token');
    }
  }

  /**
   * Token'dan tenant bilgilerini alma
   */
  async getTenantFromToken(token: string): Promise<TenantProfileResponseDto | null> {
    try {
      const payload = await this.verifyToken(token);
      const tenant = await this.tenantRepository.findOne({
        where: { id: payload.tenantId },
        relations: ['metadata']
      });

      if (!tenant) {
        return null;
      }

      return this.mapTenantToProfile(tenant);
    } catch (error) {
      this.logger.error('Get tenant from token error:', error.message);
      return null;
    }
  }

  /**
   * Keycloak'tan kullanıcı bilgilerini alma
   */
  async getUserInfoFromKeycloak(token: string): Promise<any> {
    try {
      const payload = await this.verifyToken(token);

      // Keycloak'tan kullanıcı bilgilerini al
      const userInfo = await this.keycloakService.getUserInfo(payload.keycloakId);

      return {
        success: true,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        given_name: userInfo.firstName,
        family_name: userInfo.lastName,
        email: userInfo.email
      };
    } catch (error) {
      this.logger.error('Get user info from keycloak error:', error.message);
      return { success: false, error: error.message };
    }
  }
} 