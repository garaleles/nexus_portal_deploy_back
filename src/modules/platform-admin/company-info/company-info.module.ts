import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CompanyInfoService } from './company-info.service';
import { CompanyInfoController } from './company-info.controller';
import { CompanyInfo } from './entities/company-info.entity';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyInfo]),
    ConfigModule,
    RolePermissionsModule
  ],
  controllers: [CompanyInfoController],
  providers: [CompanyInfoService, EncryptionService, CloudinaryService],
  exports: [CompanyInfoService],
})
export class CompanyInfoModule { } 