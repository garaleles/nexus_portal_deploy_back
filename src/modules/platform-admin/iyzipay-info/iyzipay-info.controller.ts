import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { IyzipayInfoService } from './iyzipay-info.service';
import { CreateIyzipayInfoDto } from './dto/create-iyzipay-info.dto';
import { UpdateIyzipayInfoDto } from './dto/update-iyzipay-info.dto';
import { PaymentRequestDto, InstallmentInfoRequestDto } from './dto/iyzipay-payment.dto';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@Controller('platform-admin/iyzipay-info')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class IyzipayInfoController {
  constructor(private readonly iyzipayInfoService: IyzipayInfoService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createIyzipayInfoDto: CreateIyzipayInfoDto) {
    return await this.iyzipayInfoService.create(createIyzipayInfoDto);
  }

  @Get()
  async findAll() {
    return await this.iyzipayInfoService.findAll();
  }

  @Get('active')
  async findActive() {
    return await this.iyzipayInfoService.findActive();
  }

  @Get('test-connection')
  async testConnection() {
    return await this.iyzipayInfoService.testConnection();
  }

  @Get('installments')
  async getAvailableInstallments(@Query('amount') amount: number) {
    return await this.iyzipayInfoService.getAvailableInstallments(amount);
  }

  @Post('calculate-installments')
  async calculateInstallments(@Body() installmentRequest: InstallmentInfoRequestDto) {
    return await this.iyzipayInfoService.calculateInstallments(
      installmentRequest.price,
      installmentRequest.binNumber
    );
  }

  @Post('process-payment')
  async processPayment(@Body() paymentRequest: PaymentRequestDto) {
    return await this.iyzipayInfoService.processPayment(paymentRequest);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.iyzipayInfoService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateIyzipayInfoDto: UpdateIyzipayInfoDto,
  ) {
    return await this.iyzipayInfoService.update(id, updateIyzipayInfoDto);
  }

  @Patch(':id/set-active')
  async setActive(@Param('id') id: string) {
    return await this.iyzipayInfoService.setActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.iyzipayInfoService.remove(id);
  }
} 