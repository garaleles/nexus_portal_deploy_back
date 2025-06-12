import { Module } from '@nestjs/common';
import { PublicCorporatePagesController } from './corporate-pages.controller';
import { CorporatePagesModule } from '../../platform-admin/corporate-pages/corporate-pages.module';

@Module({
  imports: [CorporatePagesModule],
  controllers: [PublicCorporatePagesController],
})
export class PublicCorporatePagesModule { } 