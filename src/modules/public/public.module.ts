import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PublicProductsController } from './public-products.controller';
import { PublicTenantAuthController } from './public-tenant-auth.controller';
import { PublicOrdersController } from './public-orders.controller';
import { PublicCompanyInfoController } from './public-company-info.controller';
import { PublicIndustriesController } from './public-industries.controller';
import { PublicTenantMetadataController } from './public-tenant-metadata.controller';
import { PublicContactMessagesController } from './public-contact-messages.controller';
import { PublicTenantAuthService } from './public-tenant-auth.service';
import { PublicOrdersService } from './public-orders.service';
import { ProductsModule } from '../platform-admin/products/products.module';
import { SubscriptionPlansModule } from '../platform-admin/subscription-plans/subscription-plans.module';
import { OrdersModule } from '../platform-admin/orders/orders.module';
import { CompanyInfoModule } from '../platform-admin/company-info/company-info.module';
import { IndustriesModule } from '../platform-admin/industries/industries.module';
import { EmailConfigsModule } from '../platform-admin/email-configs/email-configs.module';
import { ContactMessagesModule } from '../platform-admin/contact-messages/contact-messages.module';
import { PublicIyzipayModule } from './iyzipay/iyzipay.module';
import { PublicCorporatePagesModule } from './corporate-pages/corporate-pages.module';
import { EmailNotificationService } from '../../shared/services/email-notification.service';
import { Tenant } from '../platform-admin/tenants/entities/tenant.entity';
import { TenantMetadata } from '../platform-admin/tenants/entities/tenant-metadata.entity';
import { KeycloakService } from '../../core/auth/services/keycloak.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantMetadata]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    ProductsModule,
    SubscriptionPlansModule,
    OrdersModule,
    CompanyInfoModule,
    IndustriesModule,
    EmailConfigsModule,
    ContactMessagesModule,
    PublicIyzipayModule,
    PublicCorporatePagesModule
  ],
  controllers: [
    PublicProductsController,
    PublicTenantAuthController,
    PublicTenantMetadataController,
    PublicOrdersController,
    PublicCompanyInfoController,
    PublicIndustriesController,
    PublicContactMessagesController
  ],
  providers: [
    PublicTenantAuthService,
    PublicOrdersService,
    EmailNotificationService,
    KeycloakService
  ],
  exports: [
    PublicTenantAuthService,
    PublicOrdersService
  ]
})
export class PublicModule { } 