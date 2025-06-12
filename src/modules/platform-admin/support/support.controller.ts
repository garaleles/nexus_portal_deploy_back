import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, UnauthorizedException, Logger, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SupportService } from './support.service';
import { CreateSupportDto, UpdateSupportDto, CreateSupportMessageDto, SupportFilterDto, AddMessageDto } from './dto/support.dto';
import { TenantId } from '../../../core/common/decorators/tenant.decorator';
import { TenantRequest } from '../../../core/common/middleware/tenant.middleware';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
// import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
// import { RolesGuard } from '../../../core/auth/guards/roles.guard';
// import { Roles } from '../../../core/auth/decorators/roles.decorator';

@Controller('support')
// @UseGuards(KeycloakAuthGuard, RolesGuard)
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(
    private readonly supportService: SupportService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  // Tenant Endpoints

  /**
   * Destek talebi için dosya yükleme
   */
  @Post('tenant/upload-attachment')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
    @Req() req: TenantRequest
  ) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }

    // Dosya tipi kontrolü
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Desteklenmeyen dosya formatı. İzin verilen formatlar: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR');
    }

    // Dosya boyutu kontrolü (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Dosya boyutu 10MB\'dan büyük olamaz');
    }

    try {
      const uploadResult = await this.supportService.uploadAndSaveAttachment(file, tenantId);

      return {
        success: true,
        message: 'Dosya başarıyla yüklendi',
        data: uploadResult
      };
    } catch (error) {
      this.logger.error('Dosya yükleme hatası:', error);
      throw new BadRequestException('Dosya yüklenirken hata oluştu');
    }
  }

  @Post('tenant')
  // @Roles('tenant')
  async createSupport(@Body() createSupportDto: CreateSupportDto, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    const result = await this.supportService.createSupport(createSupportDto, tenantId);
    return {
      success: true,
      message: 'Destek talebi başarıyla oluşturuldu',
      data: result
    };
  }

  @Get('tenant/my-supports')
  // @Roles('tenant')
  async getTenantSupports(@Query() filterDto: SupportFilterDto, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    this.logger.log('🔍 getTenantSupports - Debug Info:', {
      tenantId,
      hasValidTenantUser: req.isValidTenantUser,
      userId: req.userId,
      tenant: req.tenant?.id,
      filterDto
    });

    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID bulunamadı');
    }

    const result = await this.supportService.getTenantSupports(filterDto, tenantId);
    return {
      success: true,
      data: result
    };
  }

  @Get('tenant/:id')
  // @Roles('tenant')
  async getTenantSupport(@Param('id') id: string, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    const result = await this.supportService.getTenantSupport(id, tenantId);
    return {
      success: true,
      data: result
    };
  }

  @Get('tenant/:id/messages')
  // @Roles('tenant')
  async getTenantSupportMessages(@Param('id') supportId: string, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    const support = await this.supportService.getSupportMessages(supportId, tenantId);
    return {
      success: true,
      data: support
    };
  }

  @Post('tenant/:id/messages')
  @UseInterceptors(FileInterceptor('file'))
  // @Roles('tenant')
  async addTenantMessage(
    @Param('id') supportId: string,
    @Body() createMessageDto: Omit<CreateSupportMessageDto, 'supportId'>,
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
    @Req() req: TenantRequest
  ) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    let attachmentUrl = createMessageDto.attachmentUrl;
    let uploadResult = null;

    // Eğer dosya yüklenmişse, önce yükle
    if (file) {
      // Dosya validation (aynı kurallar)
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Desteklenmeyen dosya formatı');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('Dosya boyutu 10MB\'dan büyük olamaz');
      }

      uploadResult = await this.supportService.uploadAndSaveAttachment(file, tenantId);
      attachmentUrl = uploadResult.url;
    }

    const messageDto = { ...createMessageDto, supportId, attachmentUrl };
    const result = await this.supportService.createSupportMessage(
      messageDto,
      tenantId,
      false
    );

    // Eğer dosya yüklenmişse, attachment'ı da kaydet
    if (uploadResult) {
      await this.supportService.saveAttachmentsToMessage(result.id, [uploadResult]);
    }

    return {
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: result
    };
  }

  @Put('tenant/:id/mark-read')
  // @Roles('tenant')
  async markTenantMessagesRead(@Param('id') supportId: string, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    await this.supportService.markAsRead(supportId, tenantId, false);
    return {
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi'
    };
  }

  @Delete('tenant/:id')
  // @Roles('tenant')
  async deleteTenantSupport(@Param('id') id: string, @TenantId() tenantId: string, @Req() req: TenantRequest) {
    // Tenant doğrulaması
    if (!req.isValidTenantUser) {
      throw new UnauthorizedException('Bu tenant\'a erişim yetkiniz yok');
    }

    await this.supportService.deleteSupport(id, tenantId);
    return {
      success: true,
      message: 'Destek talebi başarıyla silindi'
    };
  }

  // Admin Endpoints

  @Post('admin/upload-attachment')
  @UseInterceptors(FileInterceptor('file'))
  // @Roles('admin')
  async uploadAdminAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }

    // Dosya validation
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Desteklenmeyen dosya formatı');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Dosya boyutu 10MB\'dan büyük olamaz');
    }

    // const adminId = request.user?.sub || 'ffe6628f-bb89-43be-8ce4-84c7322ad568';
    const adminId = 'ffe6628f-bb89-43be-8ce4-84c7322ad568'; // Admin UUID

    const uploadResult = await this.supportService.uploadAndSaveAttachment(file, adminId);

    return {
      success: true,
      message: 'Dosya başarıyla yüklendi',
      data: uploadResult
    };
  }

  @Get('admin/all')
  // @Roles('admin')
  async getAllSupports(@Query() filterDto: SupportFilterDto) {
    const result = await this.supportService.getAllSupports(filterDto);
    return {
      success: true,
      data: result
    };
  }

  @Get('admin/stats')
  // @Roles('admin')
  async getSupportStats() {
    const result = await this.supportService.getSupportStats();
    return {
      success: true,
      data: result
    };
  }

  @Get('admin/notifications')
  // @Roles('admin')
  async getPendingNotifications(@Query('limit') limit: number = 10) {
    const result = await this.supportService.getPendingSupportNotifications(limit);
    return {
      success: true,
      data: result
    };
  }

  @Get('admin/:id')
  // @Roles('admin')
  async getAdminSupport(@Param('id') id: string) {
    const result = await this.supportService.getSupportById(id);
    return {
      success: true,
      data: result
    };
  }

  @Put('admin/:id')
  // @Roles('admin')
  async updateSupport(@Param('id') id: string, @Body() updateSupportDto: UpdateSupportDto) {
    const result = await this.supportService.updateSupport(id, updateSupportDto);
    return {
      success: true,
      message: 'Destek talebi başarıyla güncellendi',
      data: result
    };
  }

  @Post('admin/:id/messages')
  @UseInterceptors(FileInterceptor('file'))
  // @Roles('admin')
  async addAdminMessage(
    @Param('id') supportId: string,
    @Body() createMessageDto: Omit<CreateSupportMessageDto, 'supportId'>,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request
  ) {
    try {
      console.log('🔵 Admin mesaj endpoint başladı:', { supportId, file: !!file, messageDto: createMessageDto });

      // const adminId = request.user?.sub || 'ffe6628f-bb89-43be-8ce4-84c7322ad568';
      const adminId = 'ffe6628f-bb89-43be-8ce4-84c7322ad568'; // Admin UUID

      let attachmentUrl = createMessageDto.attachmentUrl;
      let uploadResult = null;

      // Eğer dosya yüklenmişse, önce yükle
      if (file) {
        console.log('📎 Dosya yükleme başladı:', { fileName: file.originalname, size: file.size, mimetype: file.mimetype });

        // Dosya validation (aynı kurallar)
        const allowedMimeTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'application/zip', 'application/x-rar-compressed'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException('Desteklenmeyen dosya formatı');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new BadRequestException('Dosya boyutu 10MB\'dan büyük olamaz');
        }

        uploadResult = await this.supportService.uploadAndSaveAttachment(file, adminId);
        attachmentUrl = uploadResult.url;
        console.log('✅ Dosya yüklendi:', uploadResult);
      }

      const messageDto = { ...createMessageDto, supportId, attachmentUrl };
      console.log('💬 Mesaj oluşturuluyor:', messageDto);

      const result = await this.supportService.createSupportMessage(
        messageDto,
        adminId,
        true,
        'Admin'
      );

      console.log('✅ Mesaj oluşturuldu:', result.id);

      // Eğer dosya yüklenmişse, attachment'ı da kaydet
      if (uploadResult) {
        console.log('📎 Attachment kaydediliyor...');
        await this.supportService.saveAttachmentsToMessage(result.id, [uploadResult]);
        console.log('✅ Attachment kaydedildi');
      }

      return {
        success: true,
        message: 'Yanıt başarıyla gönderildi',
        data: result
      };
    } catch (error) {
      console.error('❌ Admin mesaj hatası:', error);
      throw error;
    }
  }

  @Put('admin/:id/mark-read')
  // @Roles('admin')
  async markAdminMessagesRead(@Param('id') supportId: string) {
    await this.supportService.markMessagesAsRead(supportId, true);
    return {
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi'
    };
  }
} 