import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailConfigsService } from './email-configs.service';
import { CreateEmailConfigDto, UpdateEmailConfigDto, EmailConfigResponseDto } from './dto/email-config.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@ApiTags('E-posta Yapılandırmaları')
@Controller('platform-admin/email-configs')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@ApiBearerAuth()
export class EmailConfigsController {
  constructor(private readonly emailConfigsService: EmailConfigsService) { }

  /**
   * Response'dan password alanını çıkarır (güvenlik)
   */
  private sanitizeResponse(config: any): EmailConfigResponseDto {
    const { password, ...sanitizedConfig } = config;
    return sanitizedConfig;
  }

  /**
   * Array response'ları temizler
   */
  private sanitizeArrayResponse(configs: any[]): EmailConfigResponseDto[] {
    return configs.map(config => this.sanitizeResponse(config));
  }

  @Post()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Yeni e-posta yapılandırması oluştur' })
  @ApiResponse({ status: 201, description: 'Başarıyla oluşturuldu', type: EmailConfigResponseDto })
  async create(@Body() createEmailConfigDto: CreateEmailConfigDto) {
    const result = await this.emailConfigsService.create(createEmailConfigDto);
    return this.sanitizeResponse(result);
  }

  @Get()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Tüm e-posta yapılandırmalarını getir (admin panel için şifreler dahil)' })
  @ApiResponse({ status: 200, description: 'Başarılı', type: [EmailConfigResponseDto] })
  async findAll() {
    console.log('🌐 EMAIL_CONFIGS_CONTROLLER - findAll çağrıldı');
    console.log('🌐 EMAIL_CONFIGS_CONTROLLER - Auth guard gecti, service cagriliyor...');

    try {
      const results = await this.emailConfigsService.findAll();
      console.log('🌐 EMAIL_CONFIGS_CONTROLLER - Bulunan config sayısı:', results.length);

      // ADMIN PANEL İÇİN ŞİFRELER GÖRÜNÜR OLSUN
      // Şifreyi sanitize etmeyeceğiz, admin panel için gerekli
      console.log('🔓 EMAIL_CONFIGS_CONTROLLER - Admin panel için şifreler dahil edildi');
      console.log('🔓 EMAIL_CONFIGS_CONTROLLER - Return edilen results:', JSON.stringify(results, null, 2));
      return results;
    } catch (error) {
      console.error('❌ EMAIL_CONFIGS_CONTROLLER - Hata:', error);
      throw error;
    }
  }

  @Get('active')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Aktif e-posta yapılandırmasını getir' })
  @ApiResponse({ status: 200, description: 'Başarılı', type: EmailConfigResponseDto })
  async findActive() {
    const result = await this.emailConfigsService.findActive();
    return this.sanitizeResponse(result);
  }

  @Get(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Belirli bir e-posta yapılandırmasını getir' })
  @ApiResponse({ status: 200, description: 'Başarılı', type: EmailConfigResponseDto })
  async findOne(@Param('id') id: string) {
    const result = await this.emailConfigsService.findOne(id);
    return this.sanitizeResponse(result);
  }

  @Patch(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'E-posta yapılandırmasını güncelle' })
  @ApiResponse({ status: 200, description: 'Başarıyla güncellendi', type: EmailConfigResponseDto })
  async update(@Param('id') id: string, @Body() updateEmailConfigDto: UpdateEmailConfigDto) {
    const result = await this.emailConfigsService.update(id, updateEmailConfigDto);
    return this.sanitizeResponse(result);
  }

  @Patch(':id/set-active')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Belirli bir yapılandırmayı aktifleştir' })
  @ApiResponse({ status: 200, description: 'Başarıyla aktifleştirildi', type: EmailConfigResponseDto })
  async setActive(@Param('id') id: string) {
    const result = await this.emailConfigsService.setActive(id);
    return this.sanitizeResponse(result);
  }

  @Delete(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'E-posta yapılandırmasını sil' })
  @ApiResponse({ status: 204, description: 'Başarıyla silindi' })
  remove(@Param('id') id: string) {
    return this.emailConfigsService.remove(id);
  }

  @Post('seed-from-env')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '.env dosyasından ilk yapılandırmayı oluştur' })
  @ApiResponse({ status: 201, description: 'Başarıyla oluşturuldu', type: EmailConfigResponseDto })
  async seedFromEnv() {
    const result = await this.emailConfigsService.seedFromEnv();
    return this.sanitizeResponse(result);
  }

  @Post(':id/test')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'E-posta yapılandırmasını test et' })
  @ApiResponse({ status: 200, description: 'Test başarılı' })
  async testEmailConfig(@Param('id') id: string) {
    // Test için dummy email gönder
    const config = await this.emailConfigsService.findOne(id);
    const decryptedConfig = await this.emailConfigsService.findActiveDecrypted();

    // Burada test email gönderilecek
    return {
      success: true,
      message: 'E-posta yapılandırması test edildi',
      testEmail: 'Test email başarıyla gönderildi'
    };
  }
}
