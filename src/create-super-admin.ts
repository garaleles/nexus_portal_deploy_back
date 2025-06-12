import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PlatformUserSeeder } from './database/seeders/platform-user.seeder';

async function bootstrap() {
  const logger = new Logger('CreateSuperAdmin');
  logger.log('Süper Admin kullanıcısı oluşturma işlemi başlatılıyor...');

  try {
    const app = await NestFactory.create(AppModule);
    const platformUserSeeder = app.get(PlatformUserSeeder);
    
    logger.log('Seeder service başlatıldı, süper admin oluşturuluyor...');
    await platformUserSeeder.seed();
    
    logger.log('Süper Admin kullanıcısı başarıyla oluşturuldu!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Süper Admin oluşturma hatası: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
