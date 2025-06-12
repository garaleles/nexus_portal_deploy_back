import { PartialType } from '@nestjs/mapped-types';
import { CreateIyzipayInfoDto } from './create-iyzipay-info.dto';

export class UpdateIyzipayInfoDto extends PartialType(CreateIyzipayInfoDto) { } 