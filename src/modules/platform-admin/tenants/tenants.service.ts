import { BadRequestException, ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TenantMetadata, TenantStatus } from './entities/tenant-metadata.entity';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { randomUUID } from 'crypto';
import slugify from 'slugify';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { KeycloakService } from '../../../core/auth/services/keycloak.service';
import { EmailNotificationService, TenantWelcomeEmailData } from '../../../shared/services/email-notification.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantMetadata)
    private metadataRepository: Repository<TenantMetadata>,
    private subscriptionPlansService: SubscriptionPlansService,
    private keycloakService: KeycloakService,
    private emailNotificationService: EmailNotificationService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) { }

  /**
   * Yeni bir tenant oluşturur
   */
  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    this.logger.log(`🏗️ TENANT CREATE - Tenant oluşturma başlatılıyor: ${createTenantDto.name}`);
    this.logger.log(`🏗️ TENANT CREATE - Data:`, JSON.stringify(createTenantDto, null, 2));

    // Slug oluşturma ve benzersizlik kontrolü
    let slug = createTenantDto.slug;
    if (!slug) {
      slug = slugify(createTenantDto.name, { lower: true, strict: true });
    }

    // Benzersiz slug oluştur
    let finalSlug = slug;
    let counter = 1;

    while (true) {
      const existingTenantWithSlug = await this.tenantRepository.findOne({
        where: { slug: finalSlug },
      });

      if (!existingTenantWithSlug) {
        break; // Benzersiz slug bulundu
      }

      // Slug çakışıyor, counter ekle
      finalSlug = `${slug}-${counter}`;
      counter++;

      // Sonsuz döngü önleme (max 100 deneme)
      if (counter > 100) {
        throw new ConflictException(`'${slug}' için benzersiz slug oluşturulamadı`);
      }
    }

    this.logger.log(`🏗️ TENANT CREATE - Final slug: ${finalSlug} (${counter > 1 ? 'çakışma çözüldü' : 'benzersiz'})`);
    slug = finalSlug;

    // Email kontrolü - benzersiz olmalı (metadata tablosunda)
    const existingTenantWithEmail = await this.metadataRepository.findOne({
      where: { email: createTenantDto.email },
    });

    this.logger.log(`🏗️ TENANT CREATE - Email kontrolü (${createTenantDto.email}): ${existingTenantWithEmail ? 'MEVCUT' : 'MÜSAİT'}`);

    if (existingTenantWithEmail) {
      this.logger.error(`❌ TENANT CREATE - Email çakışması: ${createTenantDto.email} - Mevcut metadata ID: ${existingTenantWithEmail.id}`);
      throw new ConflictException(`E-posta adresi '${createTenantDto.email}' zaten kullanımda. Lütfen farklı bir e-posta adresi kullanın.`);
    }

    // 1. Önce TenantMetadata oluştur
    const metadata = new TenantMetadata();
    metadata.name = createTenantDto.name;
    metadata.slug = slug;
    metadata.email = createTenantDto.email;
    metadata.phone = createTenantDto.phone;
    metadata.address = createTenantDto.address;
    metadata.tenantType = createTenantDto.tenantType;
    metadata.taxNumber = createTenantDto.taxNumber;
    metadata.taxOffice = createTenantDto.taxOffice;
    metadata.industryId = createTenantDto.industryId;
    metadata.companyName = createTenantDto.companyName;
    metadata.firstName = createTenantDto.firstName;
    metadata.lastName = createTenantDto.lastName;
    metadata.district = createTenantDto.district;
    metadata.city = createTenantDto.city;
    metadata.status = TenantStatus.ACTIVE; // Direkt aktif yap

    // Abonelik plan bilgileri
    if (createTenantDto.subscriptionPlanId) {
      metadata.subscriptionPlanId = createTenantDto.subscriptionPlanId;
      // Abonelik planını kontrol et
      await this.subscriptionPlansService.findOne(createTenantDto.subscriptionPlanId);
    }

    // Abonelik süresi
    metadata.subscriptionDuration = createTenantDto.subscriptionDuration;

    // Abonelik başlangıç ve bitiş tarihleri
    if (createTenantDto.subscriptionStartDate) {
      metadata.subscriptionStartDate = new Date(createTenantDto.subscriptionStartDate);
    }

    if (createTenantDto.subscriptionEndDate) {
      metadata.subscriptionEndDate = new Date(createTenantDto.subscriptionEndDate);
    }

    // Custom domain
    metadata.customDomain = createTenantDto.customDomain;

    // Kullanıcı kotası
    metadata.userQuota = createTenantDto.userQuota || 10;

    // Payment status
    metadata.paymentStatus = createTenantDto.paymentStatus || false;

    // Özelleştirme bilgileri
    metadata.logoUrl = createTenantDto.logoUrl;
    metadata.primaryColor = createTenantDto.primaryColor;
    metadata.secondaryColor = createTenantDto.secondaryColor;

    // Veritabanı bilgileri (opsiyonel)
    metadata.databaseName = `tenant_${randomUUID().replace(/-/g, '')}`;

    // Metadata'yı kaydet
    const savedMetadata = await this.metadataRepository.save(metadata);

    // 2. Sonra ana Tenant oluştur ve metadata'ya bağla
    const tenant = new Tenant();
    tenant.name = createTenantDto.name;
    tenant.slug = slug;
    tenant.status = TenantStatus.ACTIVE; // Direkt aktif yap
    tenant.databaseSchema = `tenant_${slug.replace(/-/g, '_')}`;
    tenant.domain = createTenantDto.customDomain;
    tenant.metadata = savedMetadata;
    tenant.metadataId = savedMetadata.id;

    // Ana tenant'i kaydet
    const savedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`🏗️ TENANT CREATE - Tenant kaydedildi: ${savedTenant.id}`);

    // Tenant admin kullanıcısını oluştur
    this.logger.log(`🏗️ TENANT CREATE - Admin kullanıcı oluşturuluyor...`);
    await this.createTenantAdmin(
      savedTenant.id,
      createTenantDto.adminFirstName,
      createTenantDto.adminLastName,
      createTenantDto.adminEmail,
      createTenantDto.adminPassword
    );
    this.logger.log(`🏗️ TENANT CREATE - Admin kullanıcı oluşturuldu.`);

    // Welcome email gönder
    this.logger.log(`🏗️ TENANT CREATE - Welcome email gönderiliyor...`);
    await this.sendWelcomeEmail(savedTenant, createTenantDto);
    this.logger.log(`🏗️ TENANT CREATE - Welcome email süreci tamamlandı.`);

    // B2B'ye sync eventi gönder
    this.logger.log(`🏗️ TENANT CREATE - B2B sync gönderiliyor...`);
    await this.notifyB2BAboutNewTenant(savedTenant);
    this.logger.log(`🏗️ TENANT CREATE - B2B sync tamamlandı.`);

    this.logger.log(`🏗️ TENANT CREATE - Tenant oluşturma tamamlandı: ${savedTenant.id}`);
    return savedTenant;
  }

  /**
   * Tenant welcome email gönder
   */
  private async sendWelcomeEmail(tenant: Tenant, createTenantDto: CreateTenantDto): Promise<void> {
    try {
      this.logger.log(`🚀 TENANT EMAIL - Welcome email gönderimi başlatılıyor: ${createTenantDto.adminEmail}`);

      // Subscription plan adını al
      let subscriptionPlanName: string | undefined;
      if (tenant.metadata.subscriptionPlan) {
        subscriptionPlanName = tenant.metadata.subscriptionPlan.name;
      }

      // Email data hazırla
      const emailData: TenantWelcomeEmailData = {
        tenantName: tenant.metadata.name,
        tenantSlug: tenant.slug,
        adminEmail: createTenantDto.adminEmail,
        adminPassword: createTenantDto.adminPassword,
        adminFirstName: createTenantDto.adminFirstName,
        adminLastName: createTenantDto.adminLastName,
        companyName: tenant.metadata.companyName,
        subscriptionPlan: subscriptionPlanName,
        portalUrl: `${process.env.FRONTEND_URL || 'https://portal.example.com'}`,
        subscriptionUrl: tenant.metadata.subscriptionPlan ?
          `${process.env.SUBSCRIPTION_BASE_URL || 'https://app.example.com'}/${tenant.slug}` : undefined
      };

      this.logger.log(`📧 TENANT EMAIL - Email data hazırlandı:`, JSON.stringify(emailData, null, 2));

      // Email gönder
      this.logger.log(`📤 TENANT EMAIL - Email notification service çağrılıyor...`);
      const emailSent = await this.emailNotificationService.sendTenantWelcomeEmail(emailData);
      this.logger.log(`📬 TENANT EMAIL - Email gönderim sonucu: ${emailSent}`);

      if (emailSent) {
        this.logger.log(`✅ TENANT EMAIL - Welcome email sent to ${createTenantDto.adminEmail} for tenant ${tenant.metadata.name}`);
      } else {
        this.logger.warn(`❌ TENANT EMAIL - Failed to send welcome email to ${createTenantDto.adminEmail} for tenant ${tenant.metadata.name}`);
      }

    } catch (error) {
      this.logger.error(`💥 TENANT EMAIL - Error sending welcome email for tenant ${tenant.metadata.name}:`, error);
      this.logger.error(`💥 TENANT EMAIL - Error stack:`, error.stack);
      // Email hatası tenant oluşturmayı engellemez
    }
  }

  /**
 * Tenant admin kullanıcısı oluşturur ve Keycloak'ta kaydeder
 * Platform kullanıcı pattern'ini takip eder: önce Keycloak, sonra database
 */
  private async createTenantAdmin(
    tenantId: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<string> {
    try {
      // Tenant ve metadata bilgilerini al
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
        relations: ['metadata', 'metadata.subscriptionPlan']
      });

      if (!tenant || !tenant.metadata) {
        throw new NotFoundException(`Tenant bulunamadı: ${tenantId}`);
      }

      // Subscription plan'dan client code'unu al
      let clientCode: string | undefined;
      if (tenant.metadata.subscriptionPlan?.code) {
        clientCode = tenant.metadata.subscriptionPlan.code;
      }

      // 1. Önce Keycloak'ta kullanıcıyı oluştur (platform pattern)
      const keycloakUserId = await this.keycloakService.createTenantAdmin(
        firstName,
        lastName,
        email,
        password,
        tenant.metadata.name,
        tenant.metadata.id,
        clientCode
      );

      // 2. Sonra veritabanına Keycloak ID'sini kaydet (hem ana tenant hem metadata'ya)
      await this.tenantRepository.update(tenantId, {
        adminUserId: keycloakUserId,
        keycloakId: keycloakUserId
      });

      await this.metadataRepository.update(tenant.metadata.id, {
        adminUserId: keycloakUserId,
        keycloakId: keycloakUserId
      });

      this.logger.log(`Tenant admin başarıyla oluşturuldu: ${email} -> Keycloak ID: ${keycloakUserId}`);

      return keycloakUserId;
    } catch (error) {
      this.logger.error(`Tenant admin oluşturulurken hata oluştu: ${email}`, error.message);
      throw new BadRequestException(`Tenant admin oluşturulurken hata oluştu: ${error.message}`);
    }
  }

  /**
   * Tüm tenant'ları listeler - metadata ve abonelik planı ilişkisini de yükler
   */
  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      order: {
        createdAt: 'DESC',
      },
      // Metadata ve subscription plan'ı yükle
      relations: ['metadata', 'metadata.subscriptionPlan'],
    });
  }

  /**
   * ID'ye göre tenant'i bulur
   */
  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['metadata', 'metadata.subscriptionPlan'],
    });

    if (!tenant) {
      throw new NotFoundException(`ID: ${id} olan tenant bulunamadı`);
    }

    return tenant;
  }

  /**
   * Slug'a göre tenant bulur
   */
  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug },
      relations: ['metadata', 'metadata.subscriptionPlan']
    });

    if (!tenant) {
      throw new NotFoundException(`Slug: ${slug} ile tenant bulunamadı`);
    }

    return tenant;
  }

  /**
   * Tenant bilgilerini günceller
   */
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    // Önce tenant'in var olup olmadığını kontrol et
    const tenant = await this.findOne(id);

    // Slug güncelleniyorsa benzersiz olduğunu kontrol et
    if (updateTenantDto.slug) {
      const existingTenantWithSlug = await this.tenantRepository.findOne({
        where: { slug: updateTenantDto.slug },
      });

      if (existingTenantWithSlug && existingTenantWithSlug.id !== id) {
        throw new ConflictException(`'${updateTenantDto.slug}' slug'i ile kayıtlı başka bir tenant zaten var`);
      }
    }

    // Email güncelleniyorsa benzersiz olduğunu kontrol et (metadata tablosunda)
    if (updateTenantDto.email) {
      const existingTenantWithEmail = await this.metadataRepository.findOne({
        where: { email: updateTenantDto.email },
      });

      if (existingTenantWithEmail && existingTenantWithEmail.id !== tenant.metadata.id) {
        throw new ConflictException(`'${updateTenantDto.email}' ile kayıtlı başka bir tenant zaten var`);
      }
    }

    // Tarihleri dönüştürme - create metoduna benzer şekilde basitleştirilmiş yaklaşım
    console.log('Güncelleme öncesi tarih alanları:', {
      startDate: updateTenantDto.subscriptionStartDate,
      startDateType: typeof updateTenantDto.subscriptionStartDate,
      endDate: updateTenantDto.subscriptionEndDate,
      endDateType: typeof updateTenantDto.subscriptionEndDate
    });

    // Başlangıç tarihini dönüştür - create metoduyla aynı yaklaşım
    if (updateTenantDto.subscriptionStartDate) {
      try {
        // Doğrudan Date nesnesine çevir - create metoduyla aynı yaklaşım
        const startDate = new Date(updateTenantDto.subscriptionStartDate);

        // Geçerli bir tarih mi kontrol et
        if (!isNaN(startDate.getTime())) {
          console.log('Başlangıç tarihi dönüştürüldü:', startDate);
          updateTenantDto.subscriptionStartDate = startDate;
        } else {
          console.error('Geçersiz başlangıç tarihi:', updateTenantDto.subscriptionStartDate);
          throw new BadRequestException(`Geçersiz abonelik başlangıç tarihi formatı: ${updateTenantDto.subscriptionStartDate}`);
        }
      } catch (error) {
        console.error('Başlangıç tarihi dönüştürme hatası:', error);
        throw new BadRequestException(`Geçersiz abonelik başlangıç tarihi: ${error.message}`);
      }
    }

    // Bitiş tarihini dönüştür - create metoduyla aynı yaklaşım
    if (updateTenantDto.subscriptionEndDate) {
      try {
        // Doğrudan Date nesnesine çevir - create metoduyla aynı yaklaşım
        const endDate = new Date(updateTenantDto.subscriptionEndDate);

        // Geçerli bir tarih mi kontrol et
        if (!isNaN(endDate.getTime())) {
          console.log('Bitiş tarihi dönüştürüldü:', endDate);
          updateTenantDto.subscriptionEndDate = endDate;
        } else {
          console.error('Geçersiz bitiş tarihi:', updateTenantDto.subscriptionEndDate);
          throw new BadRequestException(`Geçersiz abonelik bitiş tarihi formatı: ${updateTenantDto.subscriptionEndDate}`);
        }
      } catch (error) {
        console.error('Bitiş tarihi dönüştürme hatası:', error);
        throw new BadRequestException(`Geçersiz abonelik bitiş tarihi: ${error.message}`);
      }
    }

    console.log('Güncelleme sonrası tarih alanları:', {
      startDate: updateTenantDto.subscriptionStartDate,
      endDate: updateTenantDto.subscriptionEndDate
    });

    // Güncellemeden önce subscriptionPlanId ve subscriptionDuration alanını işle
    console.log('Abonelik plan ID ve süresi:', {
      subscriptionPlanId: updateTenantDto.subscriptionPlanId,
      subscriptionDuration: updateTenantDto.subscriptionDuration
    });

    // Eğer subscriptionPlanId gönderilmişse, planın geçerli olduğunu kontrol et
    if (updateTenantDto.subscriptionPlanId) {
      try {
        // Planı kontrol et
        await this.subscriptionPlansService.findOne(updateTenantDto.subscriptionPlanId);
      } catch (error) {
        console.error('Geçersiz abonelik planı:', error);
        // Plan geçersizse field'i kaldır
        delete updateTenantDto.subscriptionPlanId;
      }
    }

    // Tüm güncellenecek alanları log'la
    console.log('Güncellenecek veriler (son):', JSON.stringify(updateTenantDto, null, 2));

    // Ana tenant alanları (name, slug, status vb.)
    const tenantFields = {
      name: updateTenantDto.name,
      slug: updateTenantDto.slug,
      status: updateTenantDto.status,
      domain: updateTenantDto.customDomain
    };

    // Metadata alanları (diğer tüm detay bilgiler)
    const metadataFields = { ...updateTenantDto };
    delete metadataFields.name; // Ana tenant'da da var
    delete metadataFields.slug; // Ana tenant'da da var
    delete metadataFields.status; // Ana tenant'da da var

    // Güncellemeleri yap
    await this.tenantRepository.update(id, tenantFields);
    if (tenant.metadata) {
      await this.metadataRepository.update(tenant.metadata.id, metadataFields);
    }

    // Güncellenmiş tenant'i döndür
    return this.findOne(id);
  }

  /**
   * Tenant'i siler
   */
  async remove(id: string): Promise<void> {
    // Önce tenant'in var olup olmadığını kontrol et
    const tenant = await this.findOne(id);

    // Keycloak kullanıcısı varsa sil (platform pattern)
    if (tenant.keycloakId) {
      try {
        await this.keycloakService.deleteUser(tenant.keycloakId);
        this.logger.log(`Tenant admin kullanıcısı Keycloak'tan silindi: ${tenant.keycloakId}`);
      } catch (error) {
        this.logger.warn(`Tenant admin kullanıcısı Keycloak'tan silinemedi: ${error.message}`);
        // Keycloak silme hatası tenant silme işlemini durdurmasın
      }
    }

    // Transaction içinde hem tenant hem metadata'yı sil
    await this.tenantRepository.manager.transaction(async (transactionalEntityManager) => {
      // Önce tenant'i sil (foreign key constraint için)
      await transactionalEntityManager.delete('tenants', id);
      this.logger.log(`Tenant silindi: ${id}`);

      // Sonra metadata'yı sil
      if (tenant.metadata?.id) {
        await transactionalEntityManager.delete('tenant_metadata', tenant.metadata.id);
        this.logger.log(`Tenant metadata silindi: ${tenant.metadata.id}`);
      }
    });
  }

  /**
   * Tenant durumunu günceller
   */
  async updateStatus(id: string, status: TenantStatus, reason?: string): Promise<Tenant> {
    // Önce tenant'in var olup olmadığını kontrol et
    const tenant = await this.findOne(id);

    // Durum güncellemesi
    const updateData: any = { status };

    // Eğer durum SUSPENDED ise, sebep gereklidir
    if (status === TenantStatus.SUSPENDED && !reason) {
      throw new BadRequestException('Tenancy askıya alınırken bir sebep belirtilmelidir');
    }

    if (reason) {
      updateData.suspensionReason = reason;
    }

    // Güncelleme işlemini yap (hem ana tenant hem metadata'da)
    await this.tenantRepository.update(id, updateData);
    if (tenant.metadata) {
      await this.metadataRepository.update(tenant.metadata.id, updateData);
    }

    // Güncellenmiş tenant'i döndür
    return this.findOne(id);
  }

  /**
   * Tenant'ın Keycloak kullanıcısının durumunu debug eder
   */
  async debugKeycloakUser(id: string): Promise<any> {
    const tenant = await this.findOne(id);

    if (!tenant.keycloakId) {
      throw new NotFoundException(`Tenant'ın Keycloak kullanıcısı bulunamadı: ${id}`);
    }

    return this.keycloakService.debugUserStatus(tenant.keycloakId);
  }

  /**
   * Tenant'ın Keycloak kullanıcısını düzeltir (required actions temizler)
   */
  async fixKeycloakUser(id: string): Promise<any> {
    const tenant = await this.findOne(id);

    if (!tenant.keycloakId) {
      throw new NotFoundException(`Tenant'ın Keycloak kullanıcısı bulunamadı: ${id}`);
    }

    await this.keycloakService.clearUserRequiredActions(tenant.keycloakId);

    // Düzeltmeden sonra durumu tekrar kontrol et
    return this.keycloakService.debugUserStatus(tenant.keycloakId);
  }

  /**
   * B2B'ye yeni tenant hakkında bildirim gönderir
   */
  private async notifyB2BAboutNewTenant(tenant: Tenant): Promise<void> {
    try {
      const b2bUrl = this.configService.get<string>('B2B_ORDER_MANAGEMENT_URL');

      if (!b2bUrl) {
        this.logger.warn('B2B_ORDER_MANAGEMENT_URL yapılandırılmamış, sync atlanıyor');
        return;
      }

      const syncUrl = `${b2bUrl}/api/sso/sync-tenant/${tenant.id}`;

      const syncData = {
        tenant: {
          id: tenant.id,
          keycloak_user_id: tenant.keycloakId,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.metadata?.email,
          company_name: tenant.metadata?.companyName,
          subscription_status: tenant.metadata?.status,
          subscription_package: tenant.metadata?.subscriptionPlan?.name,
          subscription_plan_id: tenant.metadata?.subscriptionPlanId,
          created_at: tenant.createdAt,
          updated_at: tenant.updatedAt,
          status: tenant.status,
          database_schema: tenant.databaseSchema,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
        }
      };

      this.logger.log(`B2B sync isteği gönderiliyor: ${syncUrl}`);
      this.logger.log(`B2B sync data:`, JSON.stringify(syncData, null, 2));

      const response = await firstValueFrom(
        this.httpService.post(syncUrl, syncData, {
          timeout: 10000, // 10 saniye timeout
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`B2B sync başarılı: ${tenant.id}`, response.data);
    } catch (error) {
      this.logger.error(`B2B sync hatası: ${tenant.id}`, error.message);
      // Hata olsa da tenant oluşturma devam etsin
      if (error.response) {
        this.logger.error(`B2B sync response status: ${error.response.status}`);
        this.logger.error(`B2B sync response data:`, error.response.data);
      }
    }
  }
}
