import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InitializationService } from './initialization.service';
import { InitializationController } from './initialization.controller';
import { RolesSeeder } from '../../database/seeders/roles.seeder';
import { KeycloakClientMappersSeeder } from '../../database/seeders/keycloak-client-mappers.seeder';
import { RolePermissionsModule } from '../../modules/platform-admin/role-permissions/role-permissions.module';
import { CorporatePagesModule } from '../../modules/platform-admin/corporate-pages/corporate-pages.module';

@Module({
  imports: [ConfigModule, RolePermissionsModule, CorporatePagesModule],
  controllers: [InitializationController],
  providers: [
    InitializationService,
    RolesSeeder,
    KeycloakClientMappersSeeder,
  ],
  exports: [InitializationService],
})
export class InitializationModule { } 