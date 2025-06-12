import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicIyzipayController } from './iyzipay.controller';
import { IyzipayInfoModule } from '../../platform-admin/iyzipay-info/iyzipay-info.module';

@Module({
  imports: [IyzipayInfoModule, ConfigModule],
  controllers: [PublicIyzipayController],
})
export class PublicIyzipayModule { } 