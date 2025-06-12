import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { TenantMetadata } from '../tenants/entities/tenant-metadata.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, TenantMetadata]),
    RolePermissionsModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, TypeOrmModule]
})
export class OrdersModule { } 