import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Order } from '../orders/entities/order.entity';
import { SubscriptionPlan } from '../subscription-plans/entities/subscription-plan.entity';
import { PlatformUser } from '../platform-users/entities/platform-user.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Order,
      SubscriptionPlan,
      PlatformUser
    ]),
    RolePermissionsModule
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule { }
