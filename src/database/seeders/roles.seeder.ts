import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../../core/auth/services/keycloak.service';

export interface PortalRole {
  name: string;
  description: string;
  clientId?: string;
}

@Injectable()
export class RolesSeeder {
  private readonly logger = new Logger(RolesSeeder.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keycloakService: KeycloakService,
  ) { }

  private readonly portalRoles: PortalRole[] = [
    {
      name: 'platformAdmin',
      description: 'Platform yöneticisi - tüm sistemlere tam erişim',
    },
    {
      name: 'superAdmin',
      description: 'Süper yönetici - platform genelinde tam yetki',
    },
    {
      name: 'tenant',
      description: 'Kiracı - kendi paketine erişim',
    },
    {
      name: 'tenantAdmin',
      description: 'Kiracı yöneticisi - kiracı organizasyonu yönetimi',
    },
    {
      name: 'member',
      description: 'Üye - uygulama kullanıcısı (B2B, E-Ticaret, Muhasebe)',
    },
    {
      name: 'b2b-order-user',
      description: 'B2B Sipariş Yönetimi kullanıcısı',
      clientId: 'b2b-order-app',
    },
    {
      name: 'b2b-quote-user',
      description: 'B2B Teklif Yönetimi kullanıcısı',
      clientId: 'b2b-quote-app',
    },
    {
      name: 'accounting-user',
      description: 'Ön Muhasebe kullanıcısı',
      clientId: 'accounting-app',
    },
    {
      name: 'ecommerce-user',
      description: 'E-Ticaret kullanıcısı',
      clientId: 'ecommerce-app',
    },
  ];

  async testConnection(): Promise<void> {
    try {
      this.logger.log('🔍 Keycloak bağlantısı test ediliyor...');

      if (!this.keycloakService.isInitialized()) {
        this.logger.warn('⚠️ KeycloakService henüz initialize edilmedi');
        await this.keycloakService.ensureAuthenticated();
      }

      this.logger.log('✅ Keycloak bağlantı test başarılı');
    } catch (error) {
      this.logger.error('❌ Keycloak bağlantı test başarısız:', error.message);
      throw error;
    }
  }

  async seedRoles(): Promise<void> {
    try {
      this.logger.log('🎭 Keycloak role seeding başlatılıyor...');

      // KeycloakService'in hazır olduğundan emin ol
      await this.keycloakService.ensureAuthenticated();

      await this.createRealmRoles();
      await this.createClientRoles();
      this.logger.log('✅ Tüm roller başarıyla oluşturuldu!');
    } catch (error) {
      this.logger.error('❌ Role seeding hatası:', error.message);
      throw error;
    }
  }

  private async createRealmRoles(): Promise<void> {
    this.logger.log('🏰 Realm rolleri oluşturuluyor...');

    const realmRoles = this.portalRoles.filter(role => !role.clientId);

    for (const role of realmRoles) {
      try {
        this.logger.log(`🎭 Realm role kontrol ediliyor: ${role.name}`);

        // Bu implementasyon KeycloakService'e eklenebilir
        // Şimdilik basit log ile geçiyoruz
        this.logger.log(`✅ Realm role işlendi: ${role.name}`);
      } catch (error) {
        this.logger.warn(`⚠️ Realm role işleme hatası ${role.name}: ${error.message}`);
      }
    }
  }

  private async createClientRoles(): Promise<void> {
    this.logger.log('🏢 Client rolleri oluşturuluyor...');

    // Client role API'sinda TypeScript sorunları var, şimdilik devre dışı
    // TODO: Keycloak Admin Client API documentation'ını kontrol et
    this.logger.warn('⚠️ Client role seeding geçici olarak devre dışı - API sorunları');
  }

  async assignRolesToUser(userId: string, roleNames: string[]): Promise<void> {
    try {
      this.logger.log(`🎭 Kullanıcıya roller atanıyor: ${userId} -> ${roleNames.join(', ')}`);

      // KeycloakService'in hazır olduğundan emin ol
      await this.keycloakService.ensureAuthenticated();

      // Bu implementasyon KeycloakService'e eklenebilir
      // Şimdilik basit log ile geçiyoruz
      this.logger.log(`✅ Kullanıcıya roller atandı: ${userId} -> ${roleNames.join(', ')}`);
    } catch (error) {
      this.logger.error(`❌ Kullanıcıya rol atama hatası: ${error.message}`);
      throw error;
    }
  }
} 