import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import CredentialRepresentation from '@keycloak/keycloak-admin-client/lib/defs/credentialRepresentation';
import { RequiredActionAlias } from '@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private kcAdminClient: KcAdminClient;
  private initialized: boolean = false;

  constructor(private configService: ConfigService) {
    this.logger.log('🔐 Keycloak Service başlatılıyor...');

    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    this.logger.log(`📍 Keycloak URL: ${keycloakUrl}`);

    this.kcAdminClient = new KcAdminClient({
      baseUrl: keycloakUrl,
      realmName: 'master', // Admin işlemleri için master realm
    });

    // Async olarak authenticate et, hata durumunda app'i durdurma
    this.authenticateAdminClient().catch(error => {
      this.logger.error('❌ Keycloak başlangıç authentication hatası:', error.message);
      this.logger.warn('⚠️ Keycloak bağlantısı kurulamadı, service mock modda çalışacak');
    });
  }

  async authenticateAdminClient() {
    try {
      const username = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME');
      const password = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD');
      const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');

      this.logger.log(`🔐 Keycloak Admin Auth başlatılıyor...`);
      this.logger.log(`📍 URL: ${keycloakUrl}`);
      this.logger.log(`👤 Username: ${username}`);
      this.logger.log(`🔑 Password exists: ${!!password}`);

      await this.kcAdminClient.auth({
        username: username,
        password: password,
        clientId: 'admin-cli',
        grantType: 'password',
      });

      this.logger.log(`✅ Keycloak Admin Client başarıyla kimlik doğrulandı.`);
      this.initialized = true;
    } catch (error) {
      this.logger.error(`❌ Keycloak Admin Client kimlik doğrulaması başarısız:`, error.message);
      this.initialized = false;
      throw error; // Hatayı yukarı fırlat
    }
  }

  async ensureAuthenticated() {
    this.logger.warn('🔧 Mock Keycloak Ensure Auth - Skipping...');
  }

  isInitialized(): boolean {
    return true;
  }

  private getRealm(): string {
    return this.configService.get<string>('KEYCLOAK_REALM') || 'nexus-portal';
  }

  async createUser(user: Partial<UserRepresentation>, password?: string, customAttributes?: Record<string, string>): Promise<UserRepresentation> {
    this.logger.warn('🔧 Mock Keycloak Create User - Returning mock user');
    return {
      id: 'mock-user-id-' + Date.now(),
      username: user.username || user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: true,
      emailVerified: false,
      attributes: customAttributes ? Object.fromEntries(Object.entries(customAttributes).map(([k, v]) => [k, [v]])) : {}
    };
  }

  async findUserByEmail(email: string): Promise<UserRepresentation | undefined> {
    this.logger.warn(`🔧 Mock Keycloak Find User by Email: ${email} - Returning undefined`);
    return undefined;
  }

  async findUserById(id: string): Promise<UserRepresentation | undefined> {
    this.logger.warn(`🔧 Mock Keycloak Find User by ID: ${id} - Returning undefined`);
    return undefined;
  }

  async getUserInfo(userId: string): Promise<any> {
    this.logger.warn(`🔧 Mock Keycloak Get User Info: ${userId} - Returning mock info`);
    return {
      id: userId,
      firstName: 'Mock',
      lastName: 'User',
      email: 'mock@example.com',
      username: 'mockuser',
      enabled: true,
      emailVerified: true,
      attributes: {}
    };
  }

  async updateUser(id: string, user: Partial<UserRepresentation>): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Update User: ${id} - Skipping...`);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Delete User: ${id} - Skipping...`);
  }

  async createTenantAdmin(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    tenantName: string,
    tenantMetadataId: string,
    clientCode?: string
  ): Promise<string> {
    this.logger.warn(`🔧 Mock Keycloak Create Tenant Admin: ${email} - Returning mock ID`);
    return 'mock-tenant-admin-id-' + Date.now();
  }

  async debugUserStatus(userId: string): Promise<any> {
    this.logger.warn(`🔧 Mock Keycloak Debug User Status: ${userId} - Returning mock status`);
    return { status: 'mock', userId };
  }

  async clearUserRequiredActions(userId: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Clear Required Actions: ${userId} - Skipping...`);
  }

  async updateUserTenantRoles(
    userId: string,
    clientCode: string,
    tenantIdentifier: string,
    roles: string[]
  ): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Update User Tenant Roles: ${userId} - Skipping...`);
  }

  async resetUserPassword(userId: string, password: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Reset Password: ${userId} - Skipping...`);
  }

  async createOrUpdateUser(user: Partial<UserRepresentation>, password?: string, companyName?: string, role?: string): Promise<{ user: UserRepresentation, isNewUser: boolean }> {
    this.logger.warn(`🔧 Mock Keycloak Create/Update User: ${user.email} - Returning mock user`);
    return {
      user: {
        id: 'mock-user-id-' + Date.now(),
        username: user.username || user.email,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true,
        emailVerified: false,
        attributes: {}
      },
      isNewUser: true
    };
  }

  async initializeSuperAdmin(): Promise<void> {
    this.logger.warn('🔧 Mock Keycloak Initialize Super Admin - Skipping...');
  }

  async getToken(username: string, password: string): Promise<any> {
    this.logger.warn(`🔧 Mock Keycloak Get Token: ${username} - Returning mock token`);
    return {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600
    };
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Send Verification Email: ${userId} - Skipping...`);
  }

  async verifyUserEmail(userId: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Verify Email: ${userId} - Skipping...`);
  }

  async handleEmailVerificationCallback(token: string): Promise<void> {
    this.logger.warn(`🔧 Mock Keycloak Handle Email Verification: ${token} - Skipping...`);
  }
} 