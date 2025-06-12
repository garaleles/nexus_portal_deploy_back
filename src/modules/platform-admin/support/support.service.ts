import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Support, SupportStatus } from './entities/support.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportAttachment } from './entities/support-attachment.entity';
import { CreateSupportDto, UpdateSupportDto, CreateSupportMessageDto, SupportFilterDto, AddMessageDto } from './dto/support.dto';
import { CloudinaryService, CloudinaryResponse } from '../../../core/services/cloudinary.service';
import { WebSocketService } from '../../../websocket/websocket.gateway';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Support)
    private supportRepository: Repository<Support>,
    @InjectRepository(SupportMessage)
    private supportMessageRepository: Repository<SupportMessage>,
    @InjectRepository(SupportAttachment)
    private supportAttachmentRepository: Repository<SupportAttachment>,
    private cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => WebSocketService))
    private webSocketService: WebSocketService,
  ) { }

  // Yeni destek talebi oluşturma
  async createSupport(createSupportDto: CreateSupportDto, tenantId: string): Promise<Support> {
    const support = this.supportRepository.create({
      ...createSupportDto,
      tenantId,
      lastResponseAt: new Date(),
    });

    const savedSupport = await this.supportRepository.save(support);

    // İlk mesajı da oluştur
    const firstMessage = await this.createSupportMessage({
      supportId: savedSupport.id,
      message: createSupportDto.description,
      attachmentUrl: createSupportDto.attachmentUrl,
      isInternal: false
    }, tenantId, false);

    // Eğer attachmentUrl varsa, onu attachments tablosuna da kaydet
    if (createSupportDto.attachmentUrl) {
      // URL'den publicId'yi çıkar (Cloudinary URL formatından)
      const publicId = this.extractPublicIdFromUrl(createSupportDto.attachmentUrl);
      if (publicId) {
        await this.saveAttachmentsToMessage(firstMessage.id, [{
          url: createSupportDto.attachmentUrl,
          publicId: publicId,
          originalName: 'Attachment', // Default name, gerçek isim frontend'den gelmeli
          size: 0, // Default size
          mimetype: 'unknown' // Default mimetype
        }]);
      }
    }

    const fullSupport = await this.supportRepository.findOne({
      where: { id: savedSupport.id },
      relations: ['tenant', 'messages']
    });

    // WebSocket ile yeni destek talebi bildirimini gönder
    try {
      await this.webSocketService.notifyNewSupportTicket(fullSupport);
    } catch (error) {
      console.error('WebSocket notification error:', error);
    }

    return fullSupport;
  }

  // Tenant'ın kendi destek taleplerini listeleme
  async getTenantSupports(filterDto: SupportFilterDto, tenantId: string) {
    const { page = 1, limit = 10, status, packageType, search } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) where.status = status;
    if (packageType) where.packageType = packageType;
    if (search) {
      where.title = Like(`%${search}%`);
    }

    const [supports, total] = await this.supportRepository.findAndCount({
      where,
      relations: ['messages'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: supports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Admin tarafından tüm destek taleplerini listeleme
  async getAllSupports(filterDto: SupportFilterDto) {
    const { page = 1, limit = 10, status, packageType, priority, search, assignedToAdmin, isUrgent } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (packageType) where.packageType = packageType;
    if (priority) where.priority = priority;
    if (assignedToAdmin) where.assignedToAdmin = assignedToAdmin;
    if (isUrgent !== undefined) where.isUrgent = isUrgent;
    if (search) {
      where.title = Like(`%${search}%`);
    }

    const [supports, total] = await this.supportRepository.findAndCount({
      where,
      relations: ['tenant', 'messages'],
      order: {
        isUrgent: 'DESC',
        createdAt: 'DESC'
      },
      skip,
      take: limit,
    });

    return {
      data: supports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Tenant destek detaylarını getirme
  async getTenantSupport(id: string, tenantId: string): Promise<Support> {
    const support = await this.supportRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant', 'messages', 'messages.attachments']
    });

    if (!support) {
      throw new NotFoundException('Destek talebi bulunamadı');
    }

    return support;
  }

  // Destek mesajlarını getirme
  async getSupportMessages(supportId: string, tenantId: string) {
    const support = await this.getTenantSupport(supportId, tenantId);
    return support.messages;
  }

  // Tenant mesaj ekleme
  async addMessage(supportId: string, addMessageDto: AddMessageDto, tenantId: string): Promise<SupportMessage> {
    const support = await this.getTenantSupport(supportId, tenantId);

    const message = this.supportMessageRepository.create({
      supportId,
      message: addMessageDto.message,
      attachmentUrl: addMessageDto.attachmentUrl,
      senderId: tenantId,
      senderName: support.tenant.name,
      isFromAdmin: false,
      isInternal: false
    });

    const savedMessage = await this.supportMessageRepository.save(message);

    // Support'un son cevap zamanını güncelle
    await this.supportRepository.update(support.id, {
      lastResponseAt: new Date(),
      hasUnreadAdminMessages: true,
    });

    // WebSocket ile yeni mesaj bildirimini gönder
    try {
      await this.webSocketService.notifyNewSupportMessage(
        supportId,
        { ...savedMessage, tenantId },
        'tenant'
      );
    } catch (error) {
      console.error('WebSocket notification error:', error);
    }

    return savedMessage;
  }

  // Okundu olarak işaretle
  async markAsRead(supportId: string, tenantId: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) {
      // Tenant kendi mesajlarını okuyor - admin mesajlarını okundu yap
      await this.supportMessageRepository.update(
        {
          supportId,
          isFromAdmin: true,
          isRead: false
        },
        { isRead: true }
      );

      await this.supportRepository.update(supportId, {
        hasUnreadTenantMessages: false
      });
    }
  }

  // Dosya yükleme ve attachment kaydetme
  async uploadAndSaveAttachment(
    file: Express.Multer.File,
    tenantId: string
  ): Promise<{ url: string; publicId: string; originalName: string; size: number; mimetype: string }> {
    try {
      // Cloudinary'e yükle
      const uploadResult = await this.cloudinaryService.uploadFile(file, `support-attachments/${tenantId}`);

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      throw new Error(`Dosya yükleme hatası: ${error.message}`);
    }
  }

  // Support message'a attachment kaydetme
  async saveAttachmentsToMessage(
    messageId: string,
    attachmentData: { url: string; publicId: string; originalName: string; size: number; mimetype: string; width?: number; height?: number; format?: string }[]
  ): Promise<SupportAttachment[]> {
    const attachments: SupportAttachment[] = [];

    for (const data of attachmentData) {
      const attachment = this.supportAttachmentRepository.create({
        supportMessageId: messageId,
        publicId: data.publicId,
        url: data.url,
        secureUrl: data.url,
        originalName: data.originalName,
        mimetype: data.mimetype,
        size: data.size,
        format: data.format,
        width: data.width,
        height: data.height
      });

      const savedAttachment = await this.supportAttachmentRepository.save(attachment);
      attachments.push(savedAttachment);
    }

    return attachments;
  }

  // Destek silme (Sadece tenant kendi taleplerini silebilir)
  async deleteSupport(id: string, tenantId: string): Promise<void> {
    const support = await this.getTenantSupport(id, tenantId);

    // Önce attachments'ları Cloudinary'den sil
    for (const message of support.messages) {
      if (message.attachments && message.attachments.length > 0) {
        const publicIds = message.attachments.map(att => att.publicId);
        await this.cloudinaryService.deleteMultipleFiles(publicIds);
      }
    }

    await this.supportRepository.remove(support);
  }

  // Admin için destek detaylarını getirme
  async getSupportById(id: string): Promise<Support> {
    const support = await this.supportRepository.findOne({
      where: { id },
      relations: [
        'tenant',
        'tenant.metadata',
        'tenant.metadata.subscriptionPlan',
        'messages',
        'messages.attachments'
      ]
    });

    if (!support) {
      throw new NotFoundException('Destek talebi bulunamadı');
    }

    return support;
  }

  // Destek durumunu güncelleme (Admin)
  async updateSupport(id: string, updateSupportDto: UpdateSupportDto): Promise<Support> {
    const support = await this.getSupportById(id);

    if (updateSupportDto.status === SupportStatus.RESOLVED) {
      updateSupportDto['resolvedAt'] = new Date();
    }

    await this.supportRepository.update(id, updateSupportDto);
    return this.getSupportById(id);
  }

  // Destek mesajı ekleme
  async createSupportMessage(
    createMessageDto: CreateSupportMessageDto,
    senderId: string,
    isFromAdmin: boolean,
    senderName?: string
  ): Promise<SupportMessage> {
    const support = await this.getSupportById(createMessageDto.supportId);

    const message = this.supportMessageRepository.create({
      ...createMessageDto,
      senderId,
      senderName: senderName || (isFromAdmin ? 'Admin' : support.tenant.name || 'Tenant'),
      isFromAdmin,
    });

    const savedMessage = await this.supportMessageRepository.save(message);

    // Support'un son cevap zamanını güncelle
    await this.supportRepository.update(support.id, {
      lastResponseAt: new Date(),
      hasUnreadAdminMessages: !isFromAdmin,
      hasUnreadTenantMessages: isFromAdmin,
    });

    return savedMessage;
  }

  // Mesajları okundu olarak işaretleme
  async markMessagesAsRead(supportId: string, isAdmin: boolean): Promise<void> {
    await this.supportMessageRepository.update(
      {
        supportId,
        isFromAdmin: !isAdmin, // Admin ise tenant mesajlarını, tenant ise admin mesajlarını işaretle
        isRead: false
      },
      { isRead: true }
    );

    // Support'taki okunmamış mesaj flaglerini güncelle
    const updateData = isAdmin
      ? { hasUnreadAdminMessages: false }
      : { hasUnreadTenantMessages: false };

    await this.supportRepository.update(supportId, updateData);
  }

  // Admin dashboard için istatistikler
  async getSupportStats() {
    const [
      totalSupports,
      pendingSupports,
      inProgressSupports,
      resolvedSupports,
      urgentSupports
    ] = await Promise.all([
      this.supportRepository.count(),
      this.supportRepository.count({ where: { status: SupportStatus.PENDING } }),
      this.supportRepository.count({ where: { status: SupportStatus.IN_PROGRESS } }),
      this.supportRepository.count({ where: { status: SupportStatus.RESOLVED } }),
      this.supportRepository.count({ where: { isUrgent: true, status: SupportStatus.PENDING } })
    ]);

    return {
      totalSupports,
      pendingSupports,
      inProgressSupports,
      resolvedSupports,
      urgentSupports
    };
  }

  // Admin için bekleyen destek bildirimlerini getirme
  async getPendingSupportNotifications(limit: number = 10) {
    return this.supportRepository.find({
      where: [
        { hasUnreadAdminMessages: true },
        { status: SupportStatus.PENDING }
      ],
      relations: ['tenant'],
      order: { lastResponseAt: 'DESC' },
      take: limit
    });
  }

  // Helper method: Cloudinary URL'den publicId çıkarma
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
      const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
} 