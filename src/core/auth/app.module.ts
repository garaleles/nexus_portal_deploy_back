import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from '@core/core.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import getDatabaseConfig, { TypeOrmConfigService } from '@config/database.config';
import keycloakConfig from '@config/keycloak.config';
import { DatabaseModule } from '@app/database/database.module';
import { PlatformAdminModule } from '@modules/platform-admin/platform-admin.module';
import { KeycloakService } from './services/keycloak.service';

@Module({
  imports: [
    // Ortam değişkenleri yüklenir
    ConfigModule.forRoot({
      isGlobal: true, // Tüm modüller için erişilebilir yapar
      load: [keycloakConfig], // Keycloak yapılandırmasını yükle
    }),
    // TypeORM Yapılandırması
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // Çekirdek modül
    CoreModule,
    // Database modülü (Seeder'ları içerir)
    DatabaseModule,
    // Platform Admin modülü (email-configs ve mail işlevleri içerir)
    PlatformAdminModule,
    // Tenant modülünü ihtiyaç duyulduğunda ekleyebilirsiniz
    // TenantsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TypeOrmConfigService, KeycloakService],
})
export class AppModule { }

