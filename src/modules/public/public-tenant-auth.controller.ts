import { Controller, Post, Body, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PublicTenantAuthService } from './public-tenant-auth.service';
import {
  TenantLoginDto,
  TenantHistoryCheckDto,
  TenantLoginResponseDto,
  TenantHistoryResponseDto,
  TenantProfileResponseDto
} from './dto/tenant-auth.dto';

@Controller('public/tenant-auth')
export class PublicTenantAuthController {
  constructor(
    private readonly tenantAuthService: PublicTenantAuthService
  ) { }

  /**
   * Tenant login endpoint
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: TenantLoginDto): Promise<TenantLoginResponseDto> {
    return await this.tenantAuthService.login(loginDto);
  }

  /**
   * Tenant sipariş geçmişi kontrolü
   */
  @Post('check-history')
  @HttpCode(HttpStatus.OK)
  async checkHistory(@Body() historyDto: TenantHistoryCheckDto): Promise<TenantHistoryResponseDto> {
    return await this.tenantAuthService.checkTenantHistory(historyDto);
  }

  /**
   * Token ile tenant profile bilgilerini alma
   */
  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string): Promise<TenantProfileResponseDto | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await this.tenantAuthService.getTenantFromToken(token);
  }

  /**
   * Token validation endpoint
   */
  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() { token }: { token: string }): Promise<{ valid: boolean; payload?: any }> {
    try {
      const payload = await this.tenantAuthService.verifyToken(token);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Keycloak'tan kullanıcı bilgilerini alma
   */
  @Get('user-info')
  async getUserInfo(@Headers('authorization') authHeader: string): Promise<any> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token bulunamadı' };
    }

    const token = authHeader.substring(7);
    return await this.tenantAuthService.getUserInfoFromKeycloak(token);
  }
} 