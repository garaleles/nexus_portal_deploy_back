import { Module } from '@nestjs/common';
import { EmailConfigsModule } from './email-configs/email-configs.module';
import { PlatformUsersModule } from './platform-users/platform-users.module';
import { TenantsModule } from './tenants/tenants.module';
import { IndustriesModule } from './industries/industries.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { ProductsModule } from './products/products.module';
import { CompanyInfoModule } from './company-info/company-info.module';
import { IyzipayInfoModule } from './iyzipay-info/iyzipay-info.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupportModule } from './support/support.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';
import { ContactMessagesModule } from './contact-messages/contact-messages.module';
import { CorporatePagesModule } from './corporate-pages/corporate-pages.module';

@Module({
  imports: [
    EmailConfigsModule,
    PlatformUsersModule,
    TenantsModule,
    IndustriesModule,
    SubscriptionPlansModule,
    ProductsModule,
    CompanyInfoModule,
    IyzipayInfoModule,
    OrdersModule,
    AnalyticsModule,
    SupportModule,
    RolePermissionsModule,
    ContactMessagesModule,
    CorporatePagesModule,
  ],
  exports: [
    EmailConfigsModule,
    PlatformUsersModule,
    TenantsModule,
    IndustriesModule,
    SubscriptionPlansModule,
    ProductsModule,
    CompanyInfoModule,
    IyzipayInfoModule,
    OrdersModule,
    AnalyticsModule,
    SupportModule,
    RolePermissionsModule,
    ContactMessagesModule,
    CorporatePagesModule,
  ],
})
export class PlatformAdminModule { }
