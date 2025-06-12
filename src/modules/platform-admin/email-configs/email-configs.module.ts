import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfigsService } from './email-configs.service';
import { EmailConfigsController } from './email-configs.controller';
import { EmailConfig } from './entities/email-config.entity';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailConfig]),
    RolePermissionsModule
  ],
  controllers: [EmailConfigsController],
  providers: [EmailConfigsService, EncryptionService],
  exports: [EmailConfigsService],
})
export class EmailConfigsModule { }
