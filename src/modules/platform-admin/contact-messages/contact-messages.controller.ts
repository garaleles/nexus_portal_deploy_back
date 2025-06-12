import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContactMessagesService } from './contact-messages.service';
import { UpdateContactMessageDto, ContactMessageFilterDto, ReplyContactMessageDto } from './dto/contact-message.dto';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@Controller('platform-admin/contact-messages')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) { }

  @Get()
  findAll(@Query() filters: ContactMessageFilterDto) {
    return this.contactMessagesService.findAll(filters);
  }

  @Get('stats')
  getStats() {
    return this.contactMessagesService.getStats();
  }

  @Get('unread-count')
  getUnreadCount() {
    return this.contactMessagesService.getUnreadCount();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactMessagesService.findOne(id);
  }

  @Get(':id/replies')
  getReplies(@Param('id') id: string) {
    return this.contactMessagesService.getReplies(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactMessageDto: UpdateContactMessageDto) {
    return this.contactMessagesService.update(id, updateContactMessageDto);
  }

  @Patch(':id/mark-read')
  markAsRead(@Param('id') id: string) {
    return this.contactMessagesService.markAsRead(id);
  }

  @Patch(':id/mark-replied')
  markAsReplied(@Param('id') id: string) {
    return this.contactMessagesService.markAsReplied(id);
  }

  @Post(':id/reply')
  @UseInterceptors(FileInterceptor('file'))
  async replyToMessage(
    @Param('id') id: string,
    @Body() replyDto: ReplyContactMessageDto,
    @UploadedFile() file?: Express.Multer.File,
    @Request() req?: any,
  ) {
    // Dosya validasyonu (eğer dosya varsa)
    if (file) {
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Desteklenmeyen dosya formatı. İzin verilen formatlar: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('Dosya boyutu 10MB\'dan büyük olamaz');
      }
    }

    const userId = req?.user?.email || req?.user?.preferred_username || 'unknown';
    return this.contactMessagesService.replyToMessage(id, replyDto, file, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactMessagesService.remove(id);
  }
} 