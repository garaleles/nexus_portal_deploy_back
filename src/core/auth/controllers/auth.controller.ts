import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface ServiceTokenRequest {
  service_name: string;
  secret: string;
}

export interface ServiceTokenResponse {
  access_token: string;
  expires_in: number;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  /**
   * B2B servisleri için service token üretir
   */
  @Post('service-token')
  async getServiceToken(@Body() body: ServiceTokenRequest): Promise<ServiceTokenResponse> {
    this.logger.log(`Service token isteği: ${body.service_name}`);

    // Service authentication kontrolü
    const portalServiceSecret = this.configService.get<string>('PORTAL_SERVICE_SECRET');

    if (!portalServiceSecret) {
      this.logger.error('PORTAL_SERVICE_SECRET environment variable tanımlı değil');
      throw new BadRequestException('Servis yapılandırması hatalı');
    }

    if (body.service_name === 'b2b-order-management' && body.secret === portalServiceSecret) {
      // Service token oluştur
      const payload = {
        service: body.service_name,
        type: 'service_token',
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload, {
        expiresIn: '24h', // 24 saat geçerli
      });

      this.logger.log(`Service token başarıyla oluşturuldu: ${body.service_name}`);

      return {
        access_token: token,
        expires_in: 86400, // 24 saat (saniye)
      };
    }

    this.logger.warn(`Geçersiz service token isteği: ${body.service_name}`);
    throw new UnauthorizedException('Geçersiz servis bilgileri');
  }
}
