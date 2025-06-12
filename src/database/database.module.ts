import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailConfig } from '../modules/platform-admin/email-configs/entities/email-config.entity';
import { PlatformUser } from '../modules/platform-admin/platform-users/entities/platform-user.entity';
import { Order } from '../modules/platform-admin/orders/entities/order.entity';
import { OrderItem } from '../modules/platform-admin/orders/entities/order-item.entity';
import { CorporatePage } from '../modules/platform-admin/corporate-pages/entities/corporate-page.entity';
import { DatabaseSeederService } from '../database/seeders/database-seeder.service';
import { EmailConfigSeeder } from '../database/seeders/email-config.seeder';
import { PlatformUserSeeder } from '../database/seeders/platform-user.seeder';
import { KeycloakService } from '@core/auth/services/keycloak.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([EmailConfig, PlatformUser, Order, OrderItem, CorporatePage]),
        ConfigModule,
    ],
    providers: [
        DatabaseSeederService,
        EmailConfigSeeder,
        PlatformUserSeeder,
        KeycloakService,
    ],
    exports: [
        DatabaseSeederService,
        PlatformUserSeeder,
    ],
})
export class DatabaseModule { }
