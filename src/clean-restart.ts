import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { PlatformUser } from './modules/platform-admin/platform-users/entities/platform-user.entity';
import { Repository } from 'typeorm';
import { KeycloakService } from '@core/auth/services/keycloak.service';

async function bootstrap() {
  const logger = new Logger('CleanRestart');
  logger.log('Süper Admin kullanıcısını yeniden oluşturma işlemi başlatılıyor...');

  try {
    const app = await NestFactory.create(AppModule);

    // Gerekli servisleri al
    const configService = app.get(ConfigService);
    const platformUserRepository = app.get<Repository<PlatformUser>>(getRepositoryToken(PlatformUser));
    const keycloakService = app.get(KeycloakService);

    // Mevcut süper admin kullanıcısını sil
    logger.log('Mevcut süper admin kullanıcısı aranıyor...');
    const existingUser = await platformUserRepository.findOne({
      where: { email: configService.get<string>('SUPER_ADMIN_EMAIL') || 'superadmin@nexus_businessportal.com' }
    });

    if (existingUser) {
      logger.log(`Süper admin kullanıcısı bulundu (ID: ${existingUser.id}), siliniyor...`);
      await platformUserRepository.remove(existingUser);
      logger.log('Süper admin kullanıcısı PostgreSQL veritabanından silindi');
    } else {
      logger.log('Veritabanında süper admin kullanıcısı bulunamadı');
    }

    // Keycloak bağlantısını test et
    logger.log('Keycloak bağlantısı test ediliyor...');
    const isKeycloakInitialized = keycloakService.isInitialized();

    if (isKeycloakInitialized) {
      logger.log('Keycloak bağlantısı başarılı, süper admin kullanıcısı Keycloak\'ta aranıyor...');

      try {
        // Kullanıcıyı Keycloak'ta oluştur
        const superAdminEmail = configService.get<string>('SUPER_ADMIN_EMAIL') || 'superadmin@nexus_businessportal.com';
        await keycloakService.initializeSuperAdmin();
        logger.log(`Süper admin kullanıcısı Keycloak'ta başarıyla oluşturuldu: ${superAdminEmail}`);
      } catch (keycloakError) {
        logger.error(`Keycloak'ta süper admin oluşturma hatası: ${keycloakError.message}`);
      }
    } else {
      logger.warn('Keycloak bağlantısı başarısız! Kullanıcı Keycloak\'ta oluşturulamadı');
    }

    logger.log('İşlem tamamlandı! Şimdi uygulamayı yeniden başlatarak seeder\'ın çalışmasını sağlayabilirsiniz.');

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Süper admin oluşturma hatası: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
