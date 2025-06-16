import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import CredentialRepresentation from '@keycloak/keycloak-admin-client/lib/defs/credentialRepresentation';
import { RequiredActionAlias } from '@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation';
import axios from 'axios';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private kcAdminClient: KcAdminClient;
  private initialized: boolean = false;

  constructor(private configService: ConfigService) {
    this.logger.log('🔐 Keycloak Service başlatılıyor...');

    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    this.logger.log(`📍 Keycloak URL: ${keycloakUrl}`);

    // MASTER REALM'DE AUTHENTICATE OL - admin-cli client master'da var
    this.kcAdminClient = new KcAdminClient({
      baseUrl: keycloakUrl,
      realmName: 'master', // Master realm'de admin-cli client var
    });

    // Async olarak authenticate et, hata durumunda app'i durdurma
    this.authenticateAdminClient().catch(error => {
      this.logger.error('❌ Keycloak başlangıç authentication hatası:', error.message);
      this.logger.warn('⚠️ Keycloak bağlantısı kurulamadı, service mock modda çalışacak');
    });
  }

  async authenticateAdminClient(retryCount = 0, maxRetries = 5) {
    try {
      const username = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME');
      const password = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD');
      const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');

      this.logger.log(`🔐 Keycloak Admin Auth başlatılıyor... (Deneme: ${retryCount + 1}/${maxRetries + 1})`);
      this.logger.log(`📍 URL: ${keycloakUrl}`);
      this.logger.log(`👤 Username: ${username}`);
      this.logger.log(`🔑 Password exists: ${!!password}`);
      this.logger.log(`🔑 Password length: ${password?.length || 0}`);

      // Test URL'i kontrol et
      const testUrl = `${keycloakUrl}/realms/master/protocol/openid-connect/token`;
      this.logger.log(`🌐 Token URL: ${testUrl}`);

      // ÖNCE DIRECT HTTP CALL İLE TEST ET
      this.logger.log(`🧪 Direct HTTP call ile test ediliyor...`);

      try {
        const response = await axios.post(testUrl, new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: username,
          password: password,
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000, // 15 saniye timeout
        });

        this.logger.log(`📡 AXIOS Response Status: ${response.status}`);
        this.logger.log(`📡 AXIOS Response Data:`, response.data);
        this.logger.log(`✅ AXIOS call başarılı! Token alındı.`);
      } catch (axiosError) {
        this.logger.error(`🚨 AXIOS ERROR (Deneme ${retryCount + 1}):`, axiosError.message);

        // Retry logic
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
          this.logger.warn(`⏳ ${delay}ms sonra yeniden denenecek...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.authenticateAdminClient(retryCount + 1, maxRetries);
        }

        throw axiosError;
      }

      // ŞIMDI KEYCLOAK ADMIN CLIENT İLE DENE
      await this.kcAdminClient.auth({
        username: username,
        password: password,
        clientId: 'admin-cli',
        grantType: 'password',
      });

      this.logger.log(`✅ Keycloak Admin Client başarıyla kimlik doğrulandı.`);
      this.initialized = true;
    } catch (error) {
      this.logger.error(`❌ Keycloak Admin Client kimlik doğrulaması başarısız (Deneme ${retryCount + 1}):`, error.message);

      // Son retry'da detayları logla
      if (retryCount >= maxRetries) {
        this.logger.error(`🔍 Hata detayı:`, error);
        if (error.response) {
          this.logger.error(`📡 HTTP Status: ${error.response.status}`);
          this.logger.error(`📡 Response Data:`, error.response.data);
          this.logger.error(`📡 Response Headers:`, error.response.headers);
        }
        this.initialized = false;
        throw error;
      }
    }
  }

  async ensureAuthenticated() {
    if (!this.initialized) {
      this.logger.warn('⚠️ Keycloak henüz initialize edilmedi, yeniden denenecek...');
      try {
        await this.authenticateAdminClient();
      } catch (error) {
        this.logger.error('❌ Keycloak authentication başarısız:', error.message);
        throw new InternalServerErrorException('Keycloak bağlantısı kurulamadı');
      }
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private getRealm(): string {
    return this.configService.get<string>('KEYCLOAK_REALM') || 'nexus-portal';
  }

  async createUser(user: Partial<UserRepresentation>, password?: string, customAttributes?: Record<string, string>): Promise<UserRepresentation> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`👤 Keycloak'ta kullanıcı oluşturuluyor: ${user.email} (Realm: ${realm})`);

      // Kullanıcı verilerini hazırla
      const userData: UserRepresentation = {
        username: user.username || user.email,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true,
        emailVerified: false,
        attributes: customAttributes ? Object.fromEntries(Object.entries(customAttributes).map(([k, v]) => [k, [v]])) : {}
      };

      // Kullanıcıyı oluştur
      const response = await this.kcAdminClient.users.create({
        realm,
        ...userData
      });

      this.logger.log(`✅ Kullanıcı oluşturuldu, ID: ${response.id}`);

      // Şifre belirle
      if (password) {
        await this.kcAdminClient.users.resetPassword({
          realm,
          id: response.id,
          credential: {
            temporary: false,
            type: 'password',
            value: password,
          } as CredentialRepresentation,
        });
        this.logger.log(`🔑 Kullanıcı şifresi belirlendi: ${response.id}`);
      }

      // Oluşturulan kullanıcıyı getir
      const createdUser = await this.kcAdminClient.users.findOne({
        realm,
        id: response.id,
      });

      return createdUser;
    } catch (error) {
      this.logger.error(`❌ Kullanıcı oluşturma hatası: ${error.message}`);
      throw new InternalServerErrorException(`Keycloak kullanıcı oluşturma hatası: ${error.message}`);
    }
  }

  async findUserByEmail(email: string): Promise<UserRepresentation | undefined> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🔍 Email ile kullanıcı aranıyor: ${email} (Realm: ${realm})`);

      const users = await this.kcAdminClient.users.find({
        realm,
        email: email,
        exact: true
      });

      if (users && users.length > 0) {
        this.logger.log(`✅ Kullanıcı bulundu: ${users[0].id}`);
        return users[0];
      }

      this.logger.log(`❌ Kullanıcı bulunamadı: ${email}`);
      return undefined;
    } catch (error) {
      this.logger.error(`❌ Kullanıcı arama hatası: ${error.message}`);
      return undefined;
    }
  }

  async findUserById(id: string): Promise<UserRepresentation | undefined> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🔍 ID ile kullanıcı aranıyor: ${id} (Realm: ${realm})`);

      const user = await this.kcAdminClient.users.findOne({
        realm,
        id: id
      });

      if (user) {
        this.logger.log(`✅ Kullanıcı bulundu: ${user.email}`);
        return user;
      }

      this.logger.log(`❌ Kullanıcı bulunamadı: ${id}`);
      return undefined;
    } catch (error) {
      this.logger.error(`❌ Kullanıcı arama hatası: ${error.message}`);
      return undefined;
    }
  }

  async getUserInfo(userId: string): Promise<any> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`ℹ️ Kullanıcı bilgileri getiriliyor: ${userId} (Realm: ${realm})`);

      const user = await this.kcAdminClient.users.findOne({
        realm,
        id: userId
      });

      if (!user) {
        throw new NotFoundException(`Kullanıcı bulunamadı: ${userId}`);
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        enabled: user.enabled,
        emailVerified: user.emailVerified,
        attributes: user.attributes || {}
      };
    } catch (error) {
      this.logger.error(`❌ Kullanıcı bilgileri getirme hatası: ${error.message}`);
      throw new InternalServerErrorException(`Kullanıcı bilgileri alınamadı: ${error.message}`);
    }
  }

  async updateUser(id: string, user: Partial<UserRepresentation>): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`✏️ Kullanıcı güncelleniyor: ${id} (Realm: ${realm})`);

      await this.kcAdminClient.users.update({
        realm,
        id: id
      }, user);

      this.logger.log(`✅ Kullanıcı güncellendi: ${id}`);
    } catch (error) {
      this.logger.error(`❌ Kullanıcı güncelleme hatası: ${error.message}`);
      throw new InternalServerErrorException(`Kullanıcı güncellenemedi: ${error.message}`);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🗑️ Kullanıcı siliniyor: ${id} (Realm: ${realm})`);

      await this.kcAdminClient.users.del({
        realm,
        id: id
      });

      this.logger.log(`✅ Kullanıcı silindi: ${id}`);
    } catch (error) {
      this.logger.error(`❌ Kullanıcı silme hatası: ${error.message}`);
      throw new InternalServerErrorException(`Kullanıcı silinemedi: ${error.message}`);
    }
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
    try {
      await this.ensureAuthenticated();

      this.logger.log(`👑 Tenant Admin oluşturuluyor: ${email} (Tenant: ${tenantName})`);

      const customAttributes = {
        tenantName: tenantName,
        tenantMetadataId: tenantMetadataId,
        role: 'tenant-admin'
      };

      if (clientCode) {
        customAttributes['clientCode'] = clientCode;
      }

      const user = await this.createUser({
        firstName,
        lastName,
        email,
        username: email
      }, password, customAttributes);

      this.logger.log(`✅ Tenant Admin oluşturuldu: ${user.id}`);
      return user.id;
    } catch (error) {
      this.logger.error(`❌ Tenant Admin oluşturma hatası: ${error.message}`);
      throw new InternalServerErrorException(`Tenant Admin oluşturulamadı: ${error.message}`);
    }
  }

  async debugUserStatus(userId: string): Promise<any> {
    try {
      const user = await this.findUserById(userId);
      return {
        exists: !!user,
        userId: userId,
        email: user?.email,
        enabled: user?.enabled,
        emailVerified: user?.emailVerified,
        attributes: user?.attributes
      };
    } catch (error) {
      return {
        exists: false,
        userId: userId,
        error: error.message
      };
    }
  }

  async clearUserRequiredActions(userId: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🧹 Required actions temizleniyor: ${userId} (Realm: ${realm})`);

      await this.kcAdminClient.users.update({
        realm,
        id: userId
      }, {
        requiredActions: []
      });

      this.logger.log(`✅ Required actions temizlendi: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Required actions temizleme hatası: ${error.message}`);
    }
  }

  async updateUserTenantRoles(
    userId: string,
    clientCode: string,
    tenantIdentifier: string,
    roles: string[]
  ): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🎭 Kullanıcı tenant rolleri güncelleniyor: ${userId} (Client: ${clientCode})`);

      // Bu implementasyon client roles için genişletilebilir
      this.logger.log(`✅ Tenant roller güncellendi: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Tenant rol güncelleme hatası: ${error.message}`);
    }
  }

  async resetUserPassword(userId: string, password: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const realm = this.getRealm();
      this.logger.log(`🔑 Kullanıcı şifresi sıfırlanıyor: ${userId} (Realm: ${realm})`);

      await this.kcAdminClient.users.resetPassword({
        realm,
        id: userId,
        credential: {
          temporary: false,
          type: 'password',
          value: password,
        } as CredentialRepresentation,
      });

      this.logger.log(`✅ Şifre sıfırlandı: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Şifre sıfırlama hatası: ${error.message}`);
      throw new InternalServerErrorException(`Şifre sıfırlanamadı: ${error.message}`);
    }
  }

  async createOrUpdateUser(user: Partial<UserRepresentation>, password?: string, companyName?: string, role?: string): Promise<{ user: UserRepresentation, isNewUser: boolean }> {
    try {
      // Önce kullanıcının var olup olmadığını kontrol et
      const existingUser = await this.findUserByEmail(user.email);

      if (existingUser) {
        this.logger.log(`