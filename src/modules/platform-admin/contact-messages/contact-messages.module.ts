import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ContactMessagesService } from './contact-messages.service';
import { ContactMessagesController } from './contact-messages.controller';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactMessageReply } from './entities/contact-message-reply.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { EmailNotificationService } from '../../../shared/services/email-notification.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { EmailConfigsModule } from '../email-configs/email-configs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactMessage, ContactMessageReply]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
    RolePermissionsModule,
    EmailConfigsModule
  ],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesService, EmailNotificationService, CloudinaryService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule { } 