import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import CredentialRepresentation from '@keycloak/keycloak-admin-client/lib/defs/credentialRepresentation';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private kcAdminClient: KcAdminClient;
  private initialized: boolean = false;

  constructor(private configService: ConfigService) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.get<string>('KEYCLOAK_URL'),
      realmName: 'master', // Admin işlemleri için master realm
    });
    this.authenticateAdminClient();
  }

  async authenticateAdminClient() {
    try {
      const username = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME');
      const password = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD');

      this.logger.debug(`Keycloak Admin Auth - Username: ${username}`);
      this.logger.debug(`Keycloak Admin Auth - Password exists: ${!!password}`);
      this.logger.debug(`Keycloak Admin Auth - URL: ${this.configService.get<string>('KEYCLOAK_URL')}`);

      await this.kcAdminClient.auth({
        username: username,
        password: password,
        clientId: 'admin-cli',
        grantType: 'password',
      });
      this.logger.log(`Keycloak Admin Client başarıyla kimlik doğrulandı.`);
      this.initialized = true;
    } catch (error) {
      this.logger.error(`Keycloak Admin Client kimlik doğrulaması başarısız oldu:`, error.message);
      this.logger.error(`Error response:`, error.response?.data || error);
      this.initialized = false;
      throw new InternalServerErrorException(`Keycloak Admin Client kimlik doğrulaması yapılamadı.`);
    }
  }

  async ensureAuthenticated() {
    try {
      // Token varsa ve geçerliyse devam et
      if (this.kcAdminClient.accessToken) {
        // Token'ı test et
        await this.kcAdminClient.users.find({
          realm: this.getRealm(),
          max: 1
        });
        return; // Token geçerli
      }
    } catch (error) {
      // Token geçersiz, yeniden authenticate et
      this.logger.warn('Keycloak token geçersiz, yeniden authenticate ediliyor...');
    }

    // Token yok veya geçersiz, yeniden authenticate et
    await this.authenticateAdminClient();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private getRealm(): string {
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    this.logger.debug(`Kullanılan Keycloak Realm: ${realm}`);
    return realm;
  }

  async createUser(user: Partial<UserRepresentation>, password?: string, customAttributes?: Record<string, string>): Promise<UserRepresentation> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();

      // CompanyName'i ayrı tut, çünkü UserRepresentation'da yok
      const { companyName, ...userWithoutCompany } = user as any;

      // Username eksikse email'i username olarak kullan
      const userData = {
        ...userWithoutCompany,
        username: user.username || user.email,
        enabled: true,
        emailVerified: false, // E-posta doğrulama gerekli
        requiredActions: ['verify_email'], // E-posta doğrulama action'ı
        attributes: {} as Record<string, string[]>
      };

      // Custom attributes'ları ekle
      if (customAttributes) {
        Object.keys(customAttributes).forEach(key => {
          userData.attributes[key] = [customAttributes[key]];
        });
      }

      // CompanyName'i attributes'a ekle
      if (companyName) {
        userData.attributes.companyName = [companyName];
      }

      // Debug: Keycloak'a gönderilecek veriyi logla
      this.logger.debug(`Keycloak'a gönderilecek kullanıcı verisi:`, JSON.stringify(userData, null, 2));

      const createdUser = await this.kcAdminClient.users.create({
        realm,
        ...userData,
      });

      if (password) {
        await this.kcAdminClient.users.resetPassword({
          realm,
          id: createdUser.id,
          credential: {
            type: 'password',
            value: password,
            temporary: false,
          } as CredentialRepresentation,
        });
      }

      this.logger.log(`Keycloak'ta kullanıcı oluşturuldu (e-posta doğrulama gerekli): ${user.email}`);
      return createdUser;
    } catch (error) {
      this.logger.error(`Keycloak'ta kullanıcı oluşturulurken hata oluştu: ${user.email}`, error.message);
      this.logger.error(`Hata detayları:`, error);
      throw new InternalServerErrorException(`Keycloak'ta kullanıcı oluşturulurken hata oluştu: ${error.message}`);
    }
  }

  async findUserByEmail(email: string): Promise<UserRepresentation | undefined> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      const users = await this.kcAdminClient.users.find({
        realm,
        email,
        exact: true,
      });
      return users.length > 0 ? users[0] : undefined;
    } catch (error) {
      this.logger.error(`Keycloak'ta e-posta ile kullanıcı aranırken hata oluştu: ${email}`, error.message);
      throw new InternalServerErrorException(`Keycloak'ta kullanıcı aranırken hata oluştu: ${error.message}`);
    }
  }

  async findUserById(id: string): Promise<UserRepresentation | undefined> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      const user = await this.kcAdminClient.users.findOne({
        realm,
        id,
      });
      return user || undefined;
    } catch (error) {
      this.logger.error(`Keycloak'ta ID ile kullanıcı aranırken hata oluştu: ${id}`, error.message);
      throw new InternalServerErrorException(`Keycloak'ta kullanıcı aranırken hata oluştu: ${error.message}`);
    }
  }

  async getUserInfo(userId: string): Promise<any> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      const user = await this.kcAdminClient.users.findOne({
        realm,
        id: userId,
      });

      if (!user) {
        throw new NotFoundException(`Keycloak'ta kullanıcı bulunamadı: ${userId}`);
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
      this.logger.error(`Keycloak'tan kullanıcı bilgileri alınırken hata oluştu: ${userId}`, error.message);
      throw new InternalServerErrorException(`Keycloak'tan kullanıcı bilgileri alınırken hata oluştu: ${error.message}`);
    }
  }

  async updateUser(id: string, user: Partial<UserRepresentation>): Promise<void> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      await this.kcAdminClient.users.update({ realm, id }, user);
      this.logger.log(`Keycloak'ta kullanıcı güncellendi: ${id}`);
    } catch (error) {
      this.logger.error(`Keycloak'ta kullanıcı güncellenirken hata oluştu: ${id}`, error.message);
      throw new InternalServerErrorException(`Keycloak'ta kullanıcı güncellenirken hata oluştu: ${error.message}`);
    }
  }

  async deleteUser(id: string): Promise<void> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      await this.kcAdminClient.users.del({ realm, id });
      this.logger.log(`Keycloak'tan kullanıcı silindi: ${id}`);
    } catch (error) {
      this.logger.error(`Keycloak'tan kullanıcı silinirken hata oluştu: ${id}`, error.message);
      throw new InternalServerErrorException(`Keycloak'tan kullanıcı silinirken hata oluştu: ${error.message}`);
    }
  }

  /**
 * SCOPE_NAME'e göre .env dosyasından KEY ve ROLE değerlerini dinamik olarak alır
 */
  private getScopeBasedKeysAndRoles(scopeName: string): { key: string; role: string } {
    // .env dosyasındaki SCOPE_NAME → KEY mapping'i (resimde görülen exact mapping)
    const scopeToKeyMapping: Record<string, string> = {
      'b2b-order-management': 'b2b_roles',
      'b2b-quote-management': 'b2b_qoute_roles',
      'ecommerce': 'ecommerce_roles',
      'accounting': 'accounting_roles'
    };

    // .env dosyasındaki SCOPE_NAME → ROLE mapping'i (resimde görülen exact mapping)
    const scopeToRoleMapping: Record<string, string> = {
      'b2b-order-management': 'Owner_Admin',
      'b2b-quote-management': 'Owner_Admin',
      'ecommerce': 'Owner_Admin',
      'accounting': 'Owner_Admin'
    };

    const key = scopeToKeyMapping[scopeName];
    const role = scopeToRoleMapping[scopeName];

    this.logger.log(`SCOPE_NAME: ${scopeName}`);
    this.logger.log(`Mapped KEY: ${key}`);
    this.logger.log(`Mapped ROLE: ${role}`);

    // Eğer mapping'de bulunamaz ise hata ver
    if (!key || !role) {
      this.logger.error(`SCOPE_NAME '${scopeName}' için mapping bulunamadı! Desteklenen SCOPE_NAME'ler: ${Object.keys(scopeToKeyMapping).join(', ')}`);
      throw new InternalServerErrorException(`Desteklenmeyen SCOPE_NAME: ${scopeName}`);
    }

    return { key, role };
  }

  /**
   * Tenant admin kullanıcısı oluşturur ve gerekli rolleri atar
   */
  async createTenantAdmin(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    tenantName: string,
    tenantMetadataId: string,
    clientCode?: string
  ): Promise<string> {
    const realm = this.getRealm();

    try {
      // Tenant identifier oluştur: TenantName_metadataId
      const tenantIdentifier = `${tenantName}_${tenantMetadataId}`;

      // Client ID'yi ve SCOPE_NAME'i code'dan çıkar (örn: "b2b-order-management/12" -> "b2b-order-management")
      let targetClientId = 'business-portal'; // Varsayılan client
      let scopeName = '';

      if (clientCode) {
        const parts = clientCode.split('/');
        if (parts.length > 0 && parts[0]) {
          targetClientId = parts[0];
          scopeName = parts[0]; // SCOPE_NAME clientCode'dan "/" öncesi kısım
        }
      }

      // SCOPE_NAME'e göre .env'den KEY ve ROLE değerlerini al
      const { key, role } = this.getScopeBasedKeysAndRoles(scopeName);

      this.logger.log(`Tenant admin için belirlenen değerler:`);
      this.logger.log(`- Client Code: ${clientCode}`);
      this.logger.log(`- Target Client ID: ${targetClientId}`);
      this.logger.log(`- SCOPE_NAME: ${scopeName}`);
      this.logger.log(`- Dinamik KEY: ${key}`);
      this.logger.log(`- Dinamik ROLE: ${role}`);

      // Kullanıcıyı oluştur - dinamik KEY ve ROLE kullanarak
      const keycloakUser = await this.createUser({
        email: email,
        username: email,
        firstName: firstName,
        lastName: lastName,
        enabled: true,
        emailVerified: false,
        requiredActions: ['verify_email']
      }, password, {
        tenantId: tenantMetadataId,
        tenantName: tenantName,
        tenantIdentifier: tenantIdentifier,
        [key]: role // Dinamik olarak .env'den alınan KEY ve ROLE kullanılıyor
      });

      this.logger.log(`Tenant admin kullanıcısı oluşturuldu: ${email} (${keycloakUser.id})`);
      this.logger.log(`Kullanılan KEY: ${key}, ROLE: ${role}`);

      // Verification email gönder (platform kullanıcı pattern'i gibi)
      try {
        await this.sendVerificationEmail(keycloakUser.id);
        this.logger.log(`Verification email gönderildi: ${email}`);
      } catch (emailError) {
        this.logger.warn(`Verification email gönderilemedi: ${emailError.message}`);
        // Email hatası kullanıcı oluşturma işlemini durdurmasın
      }

      return keycloakUser.id;
    } catch (error) {
      this.logger.error(`Tenant admin kullanıcısı oluşturulurken hata oluştu: ${email}`, error.message);
      throw new InternalServerErrorException(`Tenant admin kullanıcısı oluşturulurken hata oluştu: ${error.message}`);
    }
  }

  /**
   * Kullanıcının durumunu debug için kontrol eder
   */
  async debugUserStatus(userId: string): Promise<any> {
    const realm = this.getRealm();

    try {
      await this.ensureAuthenticated();

      const user = await this.kcAdminClient.users.findOne({ realm, id: userId });

      if (!user) {
        throw new NotFoundException(`Kullanıcı bulunamadı: ${userId}`);
      }

      this.logger.log(`Debug User Status - ${user.email}:`);
      this.logger.log(`- Enabled: ${user.enabled}`);
      this.logger.log(`- Email Verified: ${user.emailVerified}`);
      this.logger.log(`- Required Actions: ${JSON.stringify(user.requiredActions || [])}`);
      this.logger.log(`- Attributes: ${JSON.stringify(user.attributes || {})}`);

      // Client mappings'leri çıkar - dinamik KEY formatını da destekler
      const clientMappings: Record<string, any> = {};
      if (user.attributes) {
        Object.keys(user.attributes).forEach(key => {
          // Eski format (_roles ile biten) ve yeni dinamik format (.env'den gelen KEY'ler)
          if (key.endsWith('_roles') || key.includes('_role')) {
            let clientId = key;
            if (key.endsWith('_roles')) {
              clientId = key.replace('_roles', '').replace('_', '-');
            }
            clientMappings[clientId] = user.attributes[key][0]; // Direkt string değer
          }
        });
      }

      this.logger.log(`- Client Mappings: ${JSON.stringify(clientMappings)}`);

      return {
        id: user.id,
        email: user.email,
        enabled: user.enabled,
        emailVerified: user.emailVerified,
        requiredActions: user.requiredActions || [],
        attributes: user.attributes || {},
        clientMappings: clientMappings,
        tenantInfo: {
          tenantId: user.attributes?.tenantId?.[0] || null,
          tenantName: user.attributes?.tenantName?.[0] || null,
          tenantIdentifier: user.attributes?.tenantIdentifier?.[0] || null
        }
      };
    } catch (error) {
      this.logger.error(`User status debug hatası: ${userId}`, error.message);
      throw new InternalServerErrorException(`User status debug hatası: ${error.message}`);
    }
  }

  /**
   * Kullanıcının required actions'larını temizler
   */
  async clearUserRequiredActions(userId: string): Promise<void> {
    const realm = this.getRealm();

    try {
      await this.ensureAuthenticated();

      await this.kcAdminClient.users.update({
        realm,
        id: userId
      }, {
        requiredActions: [],
        emailVerified: true,
        enabled: true
      });

      this.logger.log(`Kullanıcının required actions'ları temizlendi: ${userId}`);
    } catch (error) {
      this.logger.error(`Required actions temizleme hatası: ${userId}`, error.message);
      throw new InternalServerErrorException(`Required actions temizleme hatası: ${error.message}`);
    }
  }

  /**
   * Kullanıcının tenant rol attribute'larını günceller
   */
  async updateUserTenantRoles(
    userId: string,
    clientCode: string,
    tenantIdentifier: string,
    roles: string[]
  ): Promise<void> {
    const realm = this.getRealm();

    try {
      await this.ensureAuthenticated();

      // Client ID'yi ve SCOPE_NAME'i code'dan çıkar
      const scopeName = clientCode.split('/')[0] || '';

      // SCOPE_NAME'e göre .env'den KEY ve ROLE değerlerini al
      const { key, role } = this.getScopeBasedKeysAndRoles(scopeName);

      // Kullanıcıyı al
      const user = await this.kcAdminClient.users.findOne({ realm, id: userId });
      if (!user) {
        throw new NotFoundException(`Kullanıcı bulunamadı: ${userId}`);
      }

      // Attribute'ı güncelle - dinamik KEY kullanarak
      await this.kcAdminClient.users.update({
        realm,
        id: userId
      }, {
        attributes: {
          ...user.attributes,
          [key]: roles[0] || role // İlk rolü al veya .env'den gelen default role
        }
      });

      this.logger.log(`Kullanıcı rolleri dinamik olarak güncellendi: ${userId} -> ${tenantIdentifier}: ${roles.join(', ')}`);
      this.logger.log(`Kullanılan KEY: ${key}, ROLE: ${roles[0] || role}`);
    } catch (error) {
      this.logger.error(`Kullanıcı rolleri güncellenirken hata oluştu: ${userId}`, error.message);
      throw new InternalServerErrorException(`Kullanıcı rolleri güncellenirken hata oluştu: ${error.message}`);
    }
  }

  async resetUserPassword(userId: string, password: string): Promise<void> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();
      await this.kcAdminClient.users.resetPassword({
        realm,
        id: userId,
        credential: {
          type: 'password',
          value: password,
          temporary: false,
        } as CredentialRepresentation,
      });
      this.logger.log(`Keycloak'ta kullanıcı şifresi güncellendi: ${userId}`);
    } catch (error) {
      this.logger.error(`Keycloak'ta kullanıcı şifresi güncellenirken hata oluştu: ${userId}`, error.message);
      throw new InternalServerErrorException(`Keycloak'ta kullanıcı şifresi güncellenirken hata oluştu: ${error.message}`);
    }
  }

  async createOrUpdateUser(user: Partial<UserRepresentation>, password?: string, companyName?: string, role?: string): Promise<{ user: UserRepresentation, isNewUser: boolean }> {
    const existingUser = await this.findUserByEmail(user.email);

    const customAttributes: Record<string, string> = {};
    if (companyName) customAttributes.companyName = companyName;
    if (role) customAttributes.role = role;

    if (existingUser) {
      // Mevcut kullanıcı güncellemesi
      const updateData = {
        ...user,
        attributes: {
          ...existingUser.attributes,
          ...(companyName && { companyName: [companyName] }),
          ...(role && { role: [role] })
        }
      };
      await this.updateUser(existingUser.id, updateData);
      return {
        user: { ...existingUser, ...updateData },
        isNewUser: false
      }; // Mevcut kullanıcı - email gönderme
    } else {
      const newUser = await this.createUser(user, password, customAttributes);
      return {
        user: newUser,
        isNewUser: true
      }; // Yeni kullanıcı - email gönderilecek
    }
  }

  async initializeSuperAdmin(): Promise<void> {
    // Buraya .env'den bilgileri okuyarak süper adminin kontrol ve oluşturma mantığını ekleyeceksiniz
    const superAdminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
    const superAdminFirstName = this.configService.get<string>('SUPER_ADMIN_FIRST_NAME');
    const superAdminLastName = this.configService.get<string>('SUPER_ADMIN_LAST_NAME');

    if (!superAdminEmail || !superAdminPassword) {
      this.logger.warn(`.env dosyasında süper yönetici e-postası veya parolası belirtilmedi. Süper yönetici oluşturulmayacak.`);
      return;
    }

    try {
      const existingKeycloakUser = await this.findUserByEmail(superAdminEmail);

      if (!existingKeycloakUser) {
        this.logger.log(`Keycloak'ta süper yönetici bulunamadı, oluşturuluyor...`);
        const newKeycloakUser = await this.createUser({
          email: superAdminEmail,
          username: superAdminEmail,
          firstName: superAdminFirstName || 'Super',
          lastName: superAdminLastName || 'Admin',
        }, superAdminPassword);
        this.logger.log(`Keycloak'ta süper yönetici oluşturuldu: ${newKeycloakUser.id}`);
      } else {
        this.logger.log(`Keycloak'ta süper yönetici zaten mevcut.`);
        // Süper yöneticiyi güncelleme ihtiyacınız varsa buraya ekleyebilirsiniz
      }
    } catch (error) {
      this.logger.error(`Süper yöneticiyi Keycloak'ta oluştururken/kontrol ederken hata oluştu:`, error.message);
    }
  }

  // Keycloak'tan token almak için bir metod (örneğin kullanıcı girişi için)
  async getToken(username: string, password: string): Promise<any> {
    const url = `${this.configService.get<string>('KEYCLOAK_URL')}/realms/${this.getRealm()}/protocol/openid-connect/token`;
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`Keycloak'tan token alınırken hata: ${response.status} - ${JSON.stringify(errorData)}`);
        throw new UnauthorizedException('Keycloak kimlik doğrulaması başarısız oldu.');
      }

      const data = await response.json();
      this.logger.log(`Keycloak'tan token başarıyla alındı.`);
      return data;
    } catch (error) {
      this.logger.error(`Keycloak token alma işleminde ağ hatası:`, error.message);
      throw new InternalServerErrorException(`Keycloak token alma işleminde ağ hatası: ${error.message}`);
    }
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();

      // Verification email gönder
      await this.kcAdminClient.users.sendVerifyEmail({
        realm,
        id: userId,
      });

      this.logger.log(`Verification email gönderildi: ${userId}`);
    } catch (error) {
      this.logger.error(`Verification email gönderilirken hata: ${error.message}`);
      throw new InternalServerErrorException(`Verification email gönderilirken hata: ${error.message}`);
    }
  }

  async verifyUserEmail(userId: string): Promise<void> {
    const realm = this.getRealm();
    try {
      await this.ensureAuthenticated();

      // Kullanıcının email verified durumunu true yap ve required actions'ı temizle
      await this.kcAdminClient.users.update({ realm, id: userId }, {
        emailVerified: true,
        requiredActions: [] // VERIFY_EMAIL action'ını kaldır
      });

      this.logger.log(`Kullanıcının e-posta doğrulaması tamamlandı: ${userId}`);
    } catch (error) {
      this.logger.error(`E-posta doğrulama güncellemesi hatası: ${error.message}`);
      throw new InternalServerErrorException(`E-posta doğrulama güncellemesi hatası: ${error.message}`);
    }
  }

  async handleEmailVerificationCallback(token: string): Promise<void> {
    try {
      // Email verification token'ı decode et ve kullanıcıyı güncelle
      // Bu method verification email linkinden gelen callback'i handle eder
      this.logger.log('E-posta doğrulama callback işleniyor...');

      // Burada token'dan user ID çıkarıp verifyUserEmail metodunu çağırabilirsiniz
      // JWT decode işlemi gerekebilir

    } catch (error) {
      this.logger.error(`E-posta doğrulama callback hatası: ${error.message}`);
      throw error;
    }
  }
} 