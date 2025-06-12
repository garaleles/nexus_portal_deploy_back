import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan]),
    RolePermissionsModule
  ],
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService],
  exports: [SubscriptionPlansService]
})
export class SubscriptionPlansModule { }
