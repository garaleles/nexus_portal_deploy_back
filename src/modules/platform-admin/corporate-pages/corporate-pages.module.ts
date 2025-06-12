import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporatePagesService } from './corporate-pages.service';
import { CorporatePagesController } from './corporate-pages.controller';
import { CorporatePage } from './entities/corporate-page.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorporatePage]),
    RolePermissionsModule
  ],
  controllers: [CorporatePagesController],
  providers: [CorporatePagesService],
  exports: [CorporatePagesService, TypeOrmModule]
})
export class CorporatePagesModule { } 