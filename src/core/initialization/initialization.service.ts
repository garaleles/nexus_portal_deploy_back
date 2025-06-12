import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolesSeeder } from '../../database/seeders/roles.seeder';
import { KeycloakClientMappersSeeder } from '../../database/seeders/keycloak-client-mappers.seeder';
import { EndpointsService } from '../../modules/platform-admin/role-permissions/services/endpoints.service';
import { RolePermissionsService } from '../../modules/platform-admin/role-permissions/services/role-permissions.service';
import { CorporatePagesService } from '../../modules/platform-admin/corporate-pages/corporate-pages.service';

@Injectable()
export class InitializationService implements OnModuleInit {
  private readonly logger = new Logger(InitializationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rolesSeeder: RolesSeeder,
    private readonly clientMappersSeeder: KeycloakClientMappersSeeder,
    private readonly endpointsService: EndpointsService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly corporatePagesService: CorporatePagesService,
  ) { }

  async onModuleInit() {
    this.logger.log("🚀 Portal initialization başlatılıyor...");

    try {
      // Keycloak'ın hazır olmasını bekle
      await this.waitForKeycloak();

      // Rolleri kontrol et ve oluştur
      await this.initializeRoles();

      // Client mappers'ları kontrol et ve oluştur
      await this.initializeClientMappers();

      // Super admin rollerini güncelle
      await this.updateSuperAdminRoles();

      // Endpoint'leri seed et
      await this.initializeEndpoints();

      // Rol izinlerini seed et
      await this.initializeRolePermissions();

      // Kurumsal sayfaları initialize et
      await this.initializeCorporatePages();

      this.logger.log("✅ Portal initialization tamamlandı!");

    } catch (error) {
      this.logger.error("❌ Portal initialization hatası:", error.message);
      // Hata durumunda uygulamayı durdurma, sadece log'la
      this.logger.warn("⚠️ Uygulama initialization hatalarına rağmen devam ediyor...");
    }
  }

  private async waitForKeycloak(maxRetries = 10, delay = 3000): Promise<void> {
    this.logger.log("Keycloak bağlantısı kontrol ediliyor...");

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Basit bir test ile Keycloak'ın çalışıp çalışmadığını kontrol et
        await this.rolesSeeder.seedRoles();
        this.logger.log("✅ Keycloak bağlantısı başarılı");
        return;
      } catch (error) {
        this.logger.warn(`Keycloak bağlantı denemesi ${i + 1}/${maxRetries} başarısız: ${error.message}`);

        if (i < maxRetries - 1) {
          this.logger.log(`${delay}ms bekleyip tekrar deneniyor...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error("Keycloak bağlantısı kurulamadı");
  }

  private async initializeRoles(): Promise<void> {
    try {
      this.logger.log("🔑 Portal rolleri kontrol ediliyor...");
      await this.rolesSeeder.seedRoles();
      this.logger.log("✅ Portal rolleri hazır");
    } catch (error) {
      this.logger.error("❌ Portal rolleri initialization hatası:", error.message);
      throw error;
    }
  }

  private async initializeClientMappers(): Promise<void> {
    try {
      this.logger.log("🗂️ JWT token mappers kontrol ediliyor...");
      await this.clientMappersSeeder.seedClientMappers();
      this.logger.log("✅ JWT token mappers hazır");
    } catch (error) {
      this.logger.error("❌ JWT token mappers initialization hatası:", error.message);
      throw error;
    }
  }

  private async updateSuperAdminRoles(): Promise<void> {
    try {
      this.logger.log("👑 Super admin rolleri kontrol ediliyor...");

      // Super admin Keycloak ID'sini environment'den al
      const superAdminKeycloakId = this.configService.get<string>('SUPER_ADMIN_KEYCLOAK_ID');

      if (superAdminKeycloakId) {
        // Super admin'e gerekli rolleri ata
        await this.rolesSeeder.assignRolesToUser(superAdminKeycloakId, [
          'superAdmin',
          'platformAdmin'
        ]);
        this.logger.log("✅ Super admin rolleri güncellendi");
      } else {
        this.logger.warn("⚠️ SUPER_ADMIN_KEYCLOAK_ID environment variable bulunamadı");
      }
    } catch (error) {
      this.logger.error("❌ Super admin rolleri güncelleme hatası:", error.message);
      // Bu hata durumunda devam et, kritik değil
    }
  }

  /**
   * Manuel olarak tüm initialization'ı yeniden çalıştır
   */
  async reinitialize(): Promise<void> {
    this.logger.log("🔄 Manual portal re-initialization başlatılıyor...");
    await this.onModuleInit();
  }

  /**
   * Sadece rolleri yeniden initialize et
   */
  async reinitializeRoles(): Promise<void> {
    this.logger.log("🔄 Manual roles re-initialization başlatılıyor...");
    await this.initializeRoles();
  }

  /**
   * Sadece client mappers'ları yeniden initialize et
   */
  async reinitializeClientMappers(): Promise<void> {
    this.logger.log("🔄 Manual client mappers re-initialization başlatılıyor...");
    await this.initializeClientMappers();
  }

  private async initializeEndpoints(): Promise<void> {
    try {
      this.logger.log("🔗 Endpoint'ler kontrol ediliyor...");
      await this.endpointsService.seedEndpoints();
      this.logger.log("✅ Endpoint'ler hazır");
    } catch (error) {
      this.logger.error("❌ Endpoint'ler initialization hatası: ", error.message);
      throw error;
    }
  }

  private async initializeRolePermissions(): Promise<void> {
    try {
      this.logger.log("🛡️ Rol izinleri kontrol ediliyor...");
      await this.rolePermissionsService.seedDefaultPermissions();
      this.logger.log("✅ Rol izinleri hazır");
    } catch (error) {
      this.logger.error("❌ Rol izinleri initialization hatası:", error.message);
      throw error;
    }
  }

  /**
   * Endpoint'leri yeniden initialize et
   */
  async reinitializeEndpoints(): Promise<void> {
    this.logger.log("🔄 Manual endpoints re-initialization başlatılıyor...");
    await this.initializeEndpoints();
  }

  /**
   * Rol izinlerini yeniden initialize et
   */
  async reinitializeRolePermissions(): Promise<void> {
    this.logger.log("🔄 Manual role permissions re-initialization başlatılıyor...");
    await this.initializeRolePermissions();
  }

  private async initializeCorporatePages(): Promise<void> {
    try {
      this.logger.log("📄 Kurumsal sayfalar kontrol ediliyor...");
      await this.corporatePagesService.initializeDefaultPages();
      this.logger.log("✅ Kurumsal sayfalar hazır");
    } catch (error) {
      this.logger.error("❌ Kurumsal sayfalar initialization hatası:", error.message);
      throw error;
    }
  }

  /**
   * Kurumsal sayfaları yeniden initialize et
   */
  async reinitializeCorporatePages(): Promise<void> {
    this.logger.log("🔄 Manual corporate pages re-initialization başlatılıyor...");
    await this.initializeCorporatePages();
  }
} 