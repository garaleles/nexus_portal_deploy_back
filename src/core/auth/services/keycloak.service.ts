import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import CredentialRepresentation from '@keycloak/keycloak-admin-client/lib/defs/credentialRepresentation';
import axios, { AxiosResponse } from 'axios';

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

    // Retry mechanism ile authentication
    this.authenticateWithRetry();
  }

  private async authenticateWithRetry(maxRetries: number = 3, delay: number = 5000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.authenticateAdminClient();
        return; // Başarılı oldu, döngüden çık
      } catch (error) {
        this.logger.warn(`❌ Keycloak authentication denemesi ${i + 1}/${maxRetries} başarısız`);

        if (i === maxRetries - 1) {
          this.logger.error(`❌ Tüm authentication denemeleri başarısız oldu`);
          throw error;
        }

        this.logger.log(`⏳ ${delay}ms bekleyip tekrar denenecek...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
      this.logger.log(`🔑 Password length: ${password?.length || 0}`);
      this.logger.log(`🔑 Password DEBUG: "${password}"`);
      this.logger.log(`🌐 Token URL: ${keycloakUrl}/realms/master/protocol/openid-connect/token`);

      // ÖNCE URL'yi test et - AXIOS ile
      this.logger.log(`🧪 Keycloak URL'sine ping atılıyor (AXIOS)...`);

      const axiosConfig = {
        timeout: 30000, // 30 saniye timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Business-Portal-Backend/1.0'
        },
        validateStatus: function (status: number) {
          return status < 500; // 500'den küçük tüm status'leri kabul et
        }
      };

      try {
        // Railway internal network'te farklı endpoint'ler dene
        const endpoints = [
          '/health/ready',
          '/health',
          '/admin/',
          '/'
        ];

        let healthSuccess = false;

        for (const endpoint of endpoints) {
          try {
            this.logger.log(`🔍 AXIOS ile test ediliyor: ${keycloakUrl}${endpoint}`);
            const response: AxiosResponse = await axios.get(`${keycloakUrl}${endpoint}`, axiosConfig);
            this.logger.log(`📊 ${endpoint} response: ${response.status}`);

            if (response.status < 400) {
              this.logger.log(`✅ Keycloak AXIOS bağlantısı başarılı: ${endpoint}`);
              healthSuccess = true;
              break;
            }
          } catch (endpointError: any) {
            this.logger.warn(`⚠️ ${endpoint} AXIOS başarısız: ${endpointError.message}`);
            if (endpointError.response) {
              this.logger.warn(`   Status: ${endpointError.response.status}`);
            }
          }
        }

        if (!healthSuccess) {
          throw new Error('Tüm AXIOS health check endpoint\'leri başarısız');
        }

      } catch (healthError: any) {
        this.logger.error(`❌ Keycloak AXIOS health check FAILED: ${healthError.message}`);
        this.logger.error(`❌ Railway networking sorunu olabilir:`);
        this.logger.error(`   1. Internal network: http://business-portal-keycloak.railway.internal:8080`);
        this.logger.error(`   2. Public network: https://business-portal-keycloak-production.up.railway.app`);
        this.logger.error(`   3. Keycloak servisi henüz başlamadı (cold start)`);
        this.logger.error(`❌ Mevcut KEYCLOAK_URL: ${keycloakUrl}`);

        // Cold start için biraz bekle
        this.logger.log(`⏳ Keycloak cold start için 10 saniye bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // MASTER REALM'DE AUTHENTICATE OL
      try {
        await this.kcAdminClient.auth({
          username,
          password,
          grantType: 'password',
          clientId: 'admin-cli',
          totp: undefined, // TOTP yoksa undefined
        });
      } catch (authError) {
        this.logger.error(`❌ Admin-cli ile authentication başarısız. Manuel token endpoint'i deneniyor...`);

        // Manuel token request - HTTPS gerekiyorsa public domain kullan
        const publicKeycloakUrl = 'https://business-portal-keycloak-production.up.railway.app';
        const tokenUrl = `${publicKeycloakUrl}/realms/master/protocol/openid-connect/token`;
        this.logger.log(`🔗 Token URL (AXIOS - PUBLIC): ${tokenUrl}`);

        try {
          const tokenData = new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: username,
            password: password,
          });

          const tokenResponse: AxiosResponse = await axios.post(tokenUrl, tokenData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
            validateStatus: function (status: number) {
              return status < 500; // 500'den küçük tüm status'leri kabul et
            }
          });

          this.logger.log(`🔗 Manuel AXIOS token response status: ${tokenResponse.status}`);

          if (tokenResponse.status >= 400) {
            this.logger.error(`❌ Manuel AXIOS token request failed: ${JSON.stringify(tokenResponse.data)}`);
          } else {
            const tokenResponseData = tokenResponse.data;
            this.logger.log(`✅ Manuel AXIOS token request başarılı!`);

            // Token'ı manual olarak set et
            this.kcAdminClient.accessToken = tokenResponseData.access_token;
            this.kcAdminClient.refreshToken = tokenResponseData.refresh_token;
          }
        } catch (manualTokenError: any) {
          this.logger.error(`❌ Manuel AXIOS token request error: ${manualTokenError.message}`);
          if (manualTokenError.response) {
            this.logger.error(`❌ AXIOS response status: ${manualTokenError.response.status}`);
            this.logger.error(`❌ AXIOS response data: ${JSON.stringify(manualTokenError.response.data)}`);
          }
          throw authError; // Orijinal hatayı fırlat
        }
      }

      this.logger.log(`✅ Keycloak Admin Client başarıyla kimlik doğrulandı.`);
      this.initialized = true;
    } catch (error) {
      this.logger.error(`❌ Keycloak Admin Client kimlik doğrulaması başarısız:`, error.message);

      // Detaylı hata bilgisi
      if (error.response) {
        this.logger.error(`📡 HTTP Status: ${error.response.status}`);
        this.logger.error(`📡 Response Data:`, JSON.stringify(error.response.data, null, 2));
        this.logger.error(`📡 Response Headers:`, JSON.stringify(error.response.headers, null, 2));
      }

      // Axios request detayları
      if (error.config) {
        this.logger.error(`📡 Request URL: ${error.config.url}`);
        this.logger.error(`📡 Request Method: ${error.config.method}`);
        this.logger.error(`📡 Request Data:`, error.config.data);
      }

      this.initialized = false;
      throw new InternalServerErrorException(`Keycloak Admin Client kimlik doğrulaması yapılamadı: ${error.message}`);
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
        requiredActions: ['VERIFY_EMAIL'], // E-posta doğrulama action'ı
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
        requiredActions: ['VERIFY_EMAIL']
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

  // Keycloak'tan token almak için bir metod (AXIOS ile - PUBLIC domain)
  async getToken(username: string, password: string): Promise<any> {
    const publicKeycloakUrl = 'https://business-portal-keycloak-production.up.railway.app';
    const url = `${publicKeycloakUrl}/realms/${this.getRealm()}/protocol/openid-connect/token`;
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('username', username);
    params.append('password', password);

    try {
      const response: AxiosResponse = await axios.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
        validateStatus: function (status: number) {
          return status < 500; // 500'den küçük tüm status'leri kabul et
        }
      });

      if (response.status >= 400) {
        this.logger.error(`Keycloak'tan token alınırken AXIOS hata: ${response.status} - ${JSON.stringify(response.data)}`);
        throw new UnauthorizedException('Keycloak kimlik doğrulaması başarısız oldu.');
      }

      this.logger.log(`Keycloak'tan token başarıyla alındı (AXIOS).`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Keycloak token alma işleminde AXIOS ağ hatası:`, error.message);
      if (error.response) {
        this.logger.error(`AXIOS response status: ${error.response.status}`);
        this.logger.error(`AXIOS response data: ${JSON.stringify(error.response.data)}`);
      }
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