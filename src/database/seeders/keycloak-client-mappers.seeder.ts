import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';

@Injectable()
export class KeycloakClientMappersSeeder {
  private readonly logger = new Logger(KeycloakClientMappersSeeder.name);
  private keycloakAdmin: KeycloakAdminClient;

  constructor(private readonly configService: ConfigService) {
    this.keycloakAdmin = new KeycloakAdminClient({
      baseUrl: this.configService.get<string>('KEYCLOAK_URL'),
      realmName: 'master',
    });
  }

  async seedClientMappers(): Promise<void> {
    try {
      this.logger.log('Keycloak client mappers seeding başlatılıyor...');

      await this.authenticateAdmin();

      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
      this.logger.debug(`Environment'dan okunan Client ID: ${clientId}`);

      const client = await this.getClient(clientId);

      if (!client) {
        throw new Error(`Client bulunamadı: ${clientId}`);
      }

      this.logger.log(`Client bulundu, DB ID: ${client.id}, Client ID: ${client.clientId}`);

      // Token'a eklenecek mapper'lar
      await this.createUserAttributeMappers(client.id!);
      await this.createRoleMappers(client.id!);
      await this.createCustomClaimMappers(client.id!);

      this.logger.log('✅ Tüm client mappers başarıyla oluşturuldu!');

    } catch (error) {
      this.logger.error('❌ Client mappers seeding hatası:', error.message);
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

  private async getClient(clientId: string): Promise<any> {
    const realm = this.configService.get<string>('KEYCLOAK_REALM');

    this.logger.debug(`Client arama - Realm: ${realm}, Client ID: ${clientId}`);

    const clients = await this.keycloakAdmin.clients.find({
      realm,
      clientId
    });

    this.logger.debug(`Bulunan client sayısı: ${clients.length}`);
    if (clients.length > 0) {
      this.logger.debug(`Client bulundu: ${clients[0].clientId}`);
    } else {
      this.logger.debug(`Client bulunamadı: ${clientId} realm: ${realm}'de`);
    }

    return clients.length > 0 ? clients[0] : null;
  }

  private async createUserAttributeMappers(clientDbId: string): Promise<void> {
    const userAttributeMappers = [
      {
        name: 'firstName-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-property-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'firstName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'firstName',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'lastName-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-property-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'lastName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'lastName',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'email-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-property-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'email',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'email',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'companyName-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'companyName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'companyName',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'keycloakId-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-property-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'id',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'keycloakId',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'tenantId-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'tenantId',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'tenantId',
          'jsonType.label': 'String'
        }
      },
      {
        name: 'role-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'role',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'role',
          'jsonType.label': 'String'
        }
      }
    ];

    for (const mapper of userAttributeMappers) {
      await this.createMapperIfNotExists(clientDbId, mapper);
    }
  }

  private async createRoleMappers(clientDbId: string): Promise<void> {
    const roleMappers = [
      {
        name: 'realm-roles-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-realm-role-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'roles',
          'jsonType.label': 'String',
          'multivalued': 'true'
        }
      },
      {
        name: 'client-roles-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'clientRoles',
          'jsonType.label': 'String',
          'multivalued': 'true'
        }
      }
    ];

    for (const mapper of roleMappers) {
      await this.createMapperIfNotExists(clientDbId, mapper);
    }
  }

  private async createCustomClaimMappers(clientDbId: string): Promise<void> {
    const customMappers = [
      {
        name: 'clientId-hardcoded-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-hardcoded-claim-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'clientId',
          'claim.value': this.configService.get<string>('KEYCLOAK_CLIENT_ID'),
          'jsonType.label': 'String'
        }
      },
      {
        name: 'portal-permissions-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'userinfo.token.claim': 'true',
          'user.attribute': 'portalPermissions',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'permissions',
          'jsonType.label': 'JSON',
          'multivalued': 'true'
        }
      }
    ];

    for (const mapper of customMappers) {
      await this.createMapperIfNotExists(clientDbId, mapper);
    }
  }

  private async createMapperIfNotExists(clientDbId: string, mapperConfig: any): Promise<void> {
    try {
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      // Mevcut mapper'ları kontrol et
      const existingMappers = await this.keycloakAdmin.clients.listProtocolMappers({
        realm: realm,
        id: clientDbId,
      });

      const existingMapper = existingMappers.find(m => m.name === mapperConfig.name);

      if (existingMapper) {
        this.logger.log(`Mapper zaten mevcut: ${mapperConfig.name}`);
        return;
      }

      // Yeni mapper oluştur - realm context ekle
      await this.keycloakAdmin.clients.addProtocolMapper({
        realm: realm,
        id: clientDbId,
      }, mapperConfig);

      this.logger.log(`✅ Mapper oluşturuldu: ${mapperConfig.name}`);

    } catch (error) {
      this.logger.warn(`Mapper oluşturma hatası ${mapperConfig.name}: ${error.message}`);
    }
  }

  /**
   * Kullanıcıya özel attribute'ları set etme
   */
  async setUserAttributes(userId: string, attributes: Record<string, string[]>): Promise<void> {
    try {
      await this.authenticateAdmin();

      await this.keycloakAdmin.users.update({ id: userId }, {
        attributes: attributes
      });

      this.logger.log(`✅ Kullanıcı attribute'ları güncellendi: ${userId}`);

    } catch (error) {
      this.logger.error(`Kullanıcı attribute güncelleme hatası: ${error.message}`);
      throw error;
    }
  }
} 