import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';
import { TenantMetadata } from './entities/tenant-metadata.entity';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';
import { KeycloakService } from '../../../core/auth/services/keycloak.service';
import { EmailNotificationService } from '../../../shared/services/email-notification.service';
import { EmailConfigsModule } from '../email-configs/email-configs.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantMetadata]),
    SubscriptionPlansModule,
    EmailConfigsModule,
    RolePermissionsModule
  ],
  controllers: [TenantsController],
  providers: [TenantsService, KeycloakService, EmailNotificationService],
  exports: [TenantsService],
})
export class TenantsModule { }
