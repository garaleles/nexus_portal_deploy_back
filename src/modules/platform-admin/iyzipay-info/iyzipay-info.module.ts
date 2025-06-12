import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IyzipayInfoService } from './iyzipay-info.service';
import { IyzipayInfoController } from './iyzipay-info.controller';
import { IyzipayInfo } from './entities/iyzipay-info.entity';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IyzipayInfo]),
    ConfigModule,
    RolePermissionsModule
  ],
  controllers: [IyzipayInfoController],
  providers: [IyzipayInfoService, EncryptionService],
  exports: [IyzipayInfoService],
})
export class IyzipayInfoModule { } 