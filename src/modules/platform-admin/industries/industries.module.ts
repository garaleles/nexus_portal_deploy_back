import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustriesService } from './industries.service';
import { IndustriesController } from './industries.controller';
import { Industry } from './entities/industry.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Industry]),
    RolePermissionsModule
  ],
  controllers: [IndustriesController],
  providers: [IndustriesService],
  exports: [IndustriesService],
})
export class IndustriesModule { }
