import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endpoint } from './entities/endpoint.entity';
import { RolePermission } from './entities/role-permission.entity';
import { EndpointsService } from './services/endpoints.service';
import { RolePermissionsService } from './services/role-permissions.service';
import { EndpointsController } from './controllers/endpoints.controller';
import { RolePermissionsController } from './controllers/role-permissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Endpoint, RolePermission]),
  ],
  controllers: [EndpointsController, RolePermissionsController],
  providers: [EndpointsService, RolePermissionsService],
  exports: [EndpointsService, RolePermissionsService],
})
export class RolePermissionsModule { } 