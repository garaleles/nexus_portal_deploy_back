import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Geçici olarak Keycloak import'larını comment out
// import KcAdminClient from '@keycloak/keycloak-admin-client';
// import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
// import CredentialRepresentation from '@keycloak/keycloak-admin-client/lib/defs/credentialRepresentation';
// import { RequiredActionAlias } from '@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation';

// Mock types
interface UserRepresentation {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private initialized: boolean = true; // Mock olarak true

  constructor(private configService: ConfigService) {
    this.logger.warn('🚨 KEYCLOAK SERVICE MOCK MODE - PRODUCTION İÇİN DEVRE DIŞI!');
    this.logger.warn('🔧 Backend çalışması için geçici mock service aktif');
  }

  async authenticateAdminClient() {
    this.logger.warn('🔧 Mock Keycloak Auth - Skipping...');
    this.initialized = true;
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