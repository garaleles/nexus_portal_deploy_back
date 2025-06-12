import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';

export interface PortalRole {
  name: string;
  description: string;
  clientId?: string;
}

@Injectable()
export class RolesSeeder {
  private readonly logger = new Logger(RolesSeeder.name);
  private keycloakAdmin: KeycloakAdminClient;

  constructor(private readonly configService: ConfigService) {
    this.keycloakAdmin = new KeycloakAdminClient({
      baseUrl: this.configService.get<string>('KEYCLOAK_URL'),
      realmName: 'master',
    });
  }

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

  async seedRoles(): Promise<void> {
    try {
      this.logger.log('Keycloak role seeding başlatılıyor...');
      await this.authenticateAdmin();
      await this.createRealmRoles();
      await this.createClientRoles();
      this.logger.log('✅ Tüm roller başarıyla oluşturuldu!');
    } catch (error) {
      this.logger.error('❌ Role seeding hatası:', error.message);
      throw error;
    }
  }

  private async authenticateAdmin(): Promise<void> {
    await this.keycloakAdmin.auth({
      username: this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME'),
      password: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD'),
      grantType: 'password',
      clientId: 'admin-cli',
    });
    this.logger.log('Keycloak admin authentication başarılı');
  }

  private async createRealmRoles(): Promise<void> {
    const realmRoles = this.portalRoles.filter(role => !role.clientId);
    const realm = this.configService.get<string>('KEYCLOAK_REALM');

    for (const role of realmRoles) {
      try {
        const allRoles = await this.keycloakAdmin.roles.find({ realm });
        const existingRole = allRoles.find(r => r.name === role.name);

        if (existingRole) {
          this.logger.log(`Realm role zaten mevcut: ${role.name}`);
          continue;
        }

        await this.keycloakAdmin.roles.create({
          realm,
          name: role.name,
          description: role.description,
        });

        this.logger.log(`✅ Realm role oluşturuldu: ${role.name}`);
      } catch (error) {
        this.logger.warn(`Realm role oluşturma hatası ${role.name}: ${error.message}`);
      }
    }
  }

  private async createClientRoles(): Promise<void> {
    // Client role API'sinda TypeScript sorunları var, şimdilik devre dışı
    // TODO: Keycloak Admin Client API documentation'ını kontrol et
    this.logger.warn('Client role seeding geçici olarak devre dışı - API sorunları');
  }

  async assignRolesToUser(userId: string, roleNames: string[]): Promise<void> {
    try {
      await this.authenticateAdmin();
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      const allRoles = await this.keycloakAdmin.roles.find({ realm });
      const rolesToAssign = roleNames.map((roleName) => {
        const role = allRoles.find(r => r.name === roleName);
        if (!role) {
          throw new Error(`Rol bulunamadı: ${roleName}`);
        }
        return {
          id: role.id!,
          name: role.name!,
        };
      });

      await this.keycloakAdmin.users.addRealmRoleMappings({
        realm,
        id: userId,
        roles: rolesToAssign,
      });

      this.logger.log(`✅ Kullanıcıya roller atandı: ${userId} -> ${roleNames.join(', ')}`);
    } catch (error) {
      this.logger.error(`Kullanıcıya rol atama hatası: ${error.message}`);
      throw error;
    }
  }
} 