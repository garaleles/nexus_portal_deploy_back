import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { Support } from './entities/support.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportAttachment } from './entities/support-attachment.entity';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { WebSocketModule } from '../../../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Support, SupportMessage, SupportAttachment]),
    forwardRef(() => WebSocketModule)
  ],
  controllers: [SupportController],
  providers: [SupportService, CloudinaryService],
  exports: [SupportService, TypeOrmModule]
})
export class SupportModule { } 