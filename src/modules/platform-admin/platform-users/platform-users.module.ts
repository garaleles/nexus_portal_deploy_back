import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
import { PlatformUser } from './entities/platform-user.entity';
import { EmailConfigsModule } from '../email-configs/email-configs.module';
import { KeycloakService } from '../../../core/auth/services/keycloak.service';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUser]),
    EmailConfigsModule,
    RolePermissionsModule
  ],
  controllers: [PlatformUsersController],
  providers: [PlatformUsersService, KeycloakService],
  exports: [PlatformUsersService],
})
export class PlatformUsersModule { }