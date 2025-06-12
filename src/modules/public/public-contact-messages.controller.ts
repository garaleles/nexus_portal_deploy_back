import { Controller, Post, Body } from '@nestjs/common';
import { ContactMessagesService } from '../platform-admin/contact-messages/contact-messages.service';
import { CreateContactMessageDto } from '../platform-admin/contact-messages/dto/contact-message.dto';

@Controller('public/contact-messages')
export class PublicContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) { }

  @Post()
  async create(@Body() createContactMessageDto: CreateContactMessageDto) {
    try {
      const message = await this.contactMessagesService.create(createContactMessageDto);
      return {
        success: true,
        message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        data: message
      };
    } catch (error) {
      return {
        success: false,
        message: 'Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
        error: error.message
      };
    }
  }
} 