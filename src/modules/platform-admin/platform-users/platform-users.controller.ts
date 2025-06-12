import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, Query, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PlatformUsersService } from './platform-users.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { PlatformUser, PlatformUserRole, PlatformUserStatus } from './entities/platform-user.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';

@ApiTags('Platform Kullanıcıları')
@Controller('platform-admin/users')
@ApiBearerAuth()
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class PlatformUsersController {
  private readonly logger = new Logger(PlatformUsersController.name);

  constructor(private readonly platformUsersService: PlatformUsersService) { }

  @Post()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Yeni platform kullanıcısı oluştur' })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla oluşturuldu.', type: PlatformUser })
  @ApiResponse({ status: 400, description: 'Geçersiz veri girişi.' })
  @ApiResponse({ status: 409, description: 'E-posta adresi zaten kullanılıyor.' })
  create(@Body() createPlatformUserDto: CreatePlatformUserDto) {
    return this.platformUsersService.create(createPlatformUserDto);
  }

  @Get()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Tüm platform kullanıcılarını getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcılar başarıyla getirildi.', type: [PlatformUser] })
  findAll() {
    return this.platformUsersService.findAll();
  }

  @Get(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Belirli bir platform kullanıcısını getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı başarıyla getirildi.', type: PlatformUser })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  findOne(@Param('id') id: string) {
    return this.platformUsersService.findOne(id);
  }

  @Patch(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Platform kullanıcısını güncelle' })
  @ApiResponse({ status: 200, description: 'Kullanıcı başarıyla güncellendi.', type: PlatformUser })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  @ApiResponse({ status: 409, description: 'E-posta adresi zaten kullanılıyor.' })
  update(@Param('id') id: string, @Body() updatePlatformUserDto: UpdatePlatformUserDto) {
    return this.platformUsersService.update(id, updatePlatformUserDto);
  }

  @Delete(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Platform kullanıcısını sil' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Kullanıcı başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  @ApiResponse({ status: 400, description: 'Super Admin kullanıcısı silinemez.' })
  remove(@Param('id') id: string) {
    return this.platformUsersService.remove(id);
  }

  @Patch(':id/role')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Kullanıcı rolünü güncelle' })
  @ApiResponse({ status: 200, description: 'Kullanıcı rolü başarıyla güncellendi.', type: PlatformUser })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  @ApiResponse({ status: 400, description: 'Super Admin rolü değiştirilemez.' })
  updateRole(
    @Param('id') id: string,
    @Body('role') role: PlatformUserRole
  ) {
    return this.platformUsersService.updateRole(id, role);
  }

  @Patch(':id/status')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Kullanıcı durumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Kullanıcı durumu başarıyla güncellendi.', type: PlatformUser })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  @ApiResponse({ status: 400, description: 'Super Admin durumu değiştirilemez.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: PlatformUserStatus
  ) {
    return this.platformUsersService.updateStatus(id, status);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifre sıfırlama talebi oluştur' })
  @ApiResponse({ status: 200, description: 'Şifre sıfırlama e-postası gönderildi.' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  requestPasswordReset(@Body('email') email: string) {
    return this.platformUsersService.createPasswordResetToken(email);
  }

  @Post('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifre sıfırlama işlemini tamamla' })
  @ApiResponse({ status: 200, description: 'Şifre başarıyla sıfırlandı.' })
  @ApiResponse({ status: 400, description: 'Geçersiz veya süresi dolmuş token.' })
  completePasswordReset(
    @Body('token') token: string,
    @Body('password') password: string
  ) {
    return this.platformUsersService.resetPassword(token, password);
  }

  @Get('email-verification/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E-posta adresini doğrula' })
  @ApiResponse({ status: 200, description: 'E-posta adresi başarıyla doğrulandı.' })
  @ApiResponse({ status: 400, description: 'Geçersiz doğrulama tokenı.' })
  verifyEmail(@Query('token') token: string) {
    return this.platformUsersService.verifyEmail(token);
  }
}
