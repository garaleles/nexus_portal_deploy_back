import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage, ContactMessageStatus } from './entities/contact-message.entity';
import { ContactMessageReply } from './entities/contact-message-reply.entity';
import { CreateContactMessageDto, UpdateContactMessageDto, ContactMessageFilterDto, ReplyContactMessageDto } from './dto/contact-message.dto';
import { EmailNotificationService } from '../../../shared/services/email-notification.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private contactMessageRepository: Repository<ContactMessage>,
    @InjectRepository(ContactMessageReply)
    private contactMessageReplyRepository: Repository<ContactMessageReply>,
    private emailNotificationService: EmailNotificationService,
    private cloudinaryService: CloudinaryService,
  ) { }

  async create(createContactMessageDto: CreateContactMessageDto): Promise<ContactMessage> {
    const contactMessage = this.contactMessageRepository.create(createContactMessageDto);
    return await this.contactMessageRepository.save(contactMessage);
  }

  async findAll(filters?: ContactMessageFilterDto): Promise<ContactMessage[]> {
    const queryBuilder = this.contactMessageRepository.createQueryBuilder('message');

    if (filters?.status) {
      queryBuilder.andWhere('message.status = :status', { status: filters.status });
    }

    if (filters?.subject) {
      queryBuilder.andWhere('message.subject = :subject', { subject: filters.subject });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(message.fullName ILIKE :search OR message.email ILIKE :search OR message.companyName ILIKE :search OR message.message ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<ContactMessage> {
    const contactMessage = await this.contactMessageRepository.findOne({
      where: { id },
      relations: ['replies'],
      order: {
        replies: {
          sentAt: 'DESC'
        }
      }
    });

    if (!contactMessage) {
      throw new NotFoundException('İletişim mesajı bulunamadı');
    }

    return contactMessage;
  }

  async update(id: string, updateContactMessageDto: UpdateContactMessageDto): Promise<ContactMessage> {
    const contactMessage = await this.findOne(id);

    Object.assign(contactMessage, updateContactMessageDto);

    return await this.contactMessageRepository.save(contactMessage);
  }

  async remove(id: string): Promise<void> {
    const contactMessage = await this.findOne(id);
    await this.contactMessageRepository.remove(contactMessage);
  }

  async markAsRead(id: string): Promise<ContactMessage> {
    return await this.update(id, { status: ContactMessageStatus.READ });
  }

  async markAsReplied(id: string): Promise<ContactMessage> {
    return await this.update(id, { status: ContactMessageStatus.REPLIED });
  }

  async replyToMessage(
    messageId: string,
    replyDto: ReplyContactMessageDto,
    file?: Express.Multer.File,
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Orijinal mesajı bul
      const originalMessage = await this.findOne(messageId);

      // Dosya varsa yükle
      let attachmentUrl = replyDto.attachmentUrl;
      let attachmentFileName = null;
      if (file) {
        const uploadResult = await this.cloudinaryService.uploadFile(file, 'contact-message-replies');
        attachmentUrl = uploadResult.secure_url;
        attachmentFileName = file.originalname;
      }

      // Email template için veri hazırla
      const emailData = {
        customerName: originalMessage.fullName,
        customerEmail: originalMessage.email,
        originalSubject: originalMessage.subject,
        originalMessage: originalMessage.message,
        replyMessage: replyDto.replyMessage,
        companyName: originalMessage.companyName || 'Müşteri',
        fromName: replyDto.fromName || 'Business Portal Destek Ekibi',
        attachmentUrl: attachmentUrl
      };

      // Email gönder
      const emailSent = await this.emailNotificationService.sendContactMessageReply(emailData);

      // Cevabı veritabanına kaydet
      const reply = this.contactMessageReplyRepository.create({
        contactMessageId: messageId,
        replyMessage: replyDto.replyMessage,
        fromName: replyDto.fromName || 'Business Portal Destek Ekibi',
        attachmentUrl: attachmentUrl,
        attachmentFileName: attachmentFileName,
        emailSent: emailSent,
        sentBy: userId || 'system',
        sentAt: new Date()
      });

      await this.contactMessageReplyRepository.save(reply);

      if (emailSent) {
        // Mesajı "cevaplandı" olarak işaretle
        await this.markAsReplied(messageId);

        return {
          success: true,
          message: 'Cevabınız başarıyla gönderildi ve kaydedildi'
        };
      } else {
        return {
          success: false,
          message: 'Cevap kaydedildi ancak email gönderilemedi'
        };
      }
    } catch (error) {
      console.error('Reply gönderme hatası:', error);
      return {
        success: false,
        message: 'Cevap gönderilirken hata oluştu'
      };
    }
  }

  async getUnreadCount(): Promise<number> {
    return await this.contactMessageRepository.count({
      where: { status: ContactMessageStatus.UNREAD }
    });
  }

  async getStats(): Promise<{ total: number; unread: number; read: number; replied: number }> {
    const [total, unread, read, replied] = await Promise.all([
      this.contactMessageRepository.count(),
      this.contactMessageRepository.count({ where: { status: ContactMessageStatus.UNREAD } }),
      this.contactMessageRepository.count({ where: { status: ContactMessageStatus.READ } }),
      this.contactMessageRepository.count({ where: { status: ContactMessageStatus.REPLIED } }),
    ]);

    return { total, unread, read, replied };
  }

  async getReplies(messageId: string): Promise<ContactMessageReply[]> {
    return await this.contactMessageReplyRepository.find({
      where: { contactMessageId: messageId },
      order: { sentAt: 'DESC' }
    });
  }
} 