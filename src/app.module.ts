import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from './core/core.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig, { TypeOrmConfigService } from './config/database.config';
import keycloakConfig from './config/keycloak.config';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { PublicModule } from './modules/public/public.module';
import { DatabaseModule } from './database/database.module';
import { TenantMiddleware } from './core/common/middleware/tenant.middleware';
import { Tenant } from './modules/platform-admin/tenants/entities/tenant.entity';
import { TenantMetadata } from './modules/platform-admin/tenants/entities/tenant-metadata.entity';
import { InitializationModule } from './core/initialization/initialization.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
    imports: [
        // Ortam değişkenleri ve konfigürasyon yüklenir
        ConfigModule.forRoot({
            isGlobal: true, // Tüm modüller için erişilebilir yapar
            load: [databaseConfig, keycloakConfig],
        }),
        // TypeORM Yapılandırması
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                ...configService.get('database')
            }),
        }),
        // Tenant entity'lerini middleware için import et
        TypeOrmModule.forFeature([Tenant, TenantMetadata]),
        // Çekirdek modül
        CoreModule,
        // Platform Admin modülü
        PlatformAdminModule,
        // Public API modülü
        PublicModule,
        // Database Modülü (seeders içerir)
        DatabaseModule,
        // Initialization modülü (otomatik seeder'lar)
        InitializationModule,
        // WebSocket modülü (real-time notifications)
        WebSocketModule,
        // Tenant modülünü ihtiyaç duyulduğunda ekleyebilirsiniz
        // TenantsModule,
    ],
    controllers: [AppController],
    providers: [AppService, TypeOrmConfigService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .exclude(
                'api/public/(.*)',  // Public endpoint'leri exclude et (başında / olmadan)
                'health',           // Health check'i exclude et
                '/'                 // Root endpoint'i exclude et
            )
            .forRoutes('*'); // Diğer tüm route'lara tenant middleware'ini uygula
    }
}