import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Endpoint, EndpointMethod, EndpointCategory } from '../entities/endpoint.entity';
import { CreateEndpointDto } from '../dto/create-endpoint.dto';
import { UpdateEndpointDto } from '../dto/update-endpoint.dto';

@Injectable()
export class EndpointsService {
  private readonly logger = new Logger(EndpointsService.name);

  constructor(
    @InjectRepository(Endpoint)
    private endpointsRepository: Repository<Endpoint>,
  ) { }

  async create(createEndpointDto: CreateEndpointDto): Promise<Endpoint> {
    // Aynı path ve method kombinasyonu var mı kontrol et
    const existing = await this.endpointsRepository.findOne({
      where: {
        path: createEndpointDto.path,
        method: createEndpointDto.method
      }
    });

    if (existing) {
      throw new ConflictException('Bu endpoint zaten mevcut');
    }

    const endpoint = this.endpointsRepository.create(createEndpointDto);
    return await this.endpointsRepository.save(endpoint);
  }

  async findAll(): Promise<Endpoint[]> {
    return await this.endpointsRepository.find({
      relations: ['rolePermissions'],
      order: {
        category: 'ASC',
        path: 'ASC'
      }
    });
  }

  async findByCategory(category: EndpointCategory): Promise<Endpoint[]> {
    return await this.endpointsRepository.find({
      where: { category },
      relations: ['rolePermissions'],
      order: { path: 'ASC' }
    });
  }

  async findOne(id: string): Promise<Endpoint> {
    const endpoint = await this.endpointsRepository.findOne({
      where: { id },
      relations: ['rolePermissions']
    });

    if (!endpoint) {
      throw new NotFoundException('Endpoint bulunamadı');
    }

    return endpoint;
  }

  async update(id: string, updateEndpointDto: UpdateEndpointDto): Promise<Endpoint> {
    const endpoint = await this.findOne(id);

    // Eğer path veya method güncelleniyorsa, çakışma kontrolü yap
    if (updateEndpointDto.path || updateEndpointDto.method) {
      const path = updateEndpointDto.path || endpoint.path;
      const method = updateEndpointDto.method || endpoint.method;

      const existing = await this.endpointsRepository.findOne({
        where: { path, method }
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Bu endpoint zaten mevcut');
      }
    }

    Object.assign(endpoint, updateEndpointDto);
    return await this.endpointsRepository.save(endpoint);
  }

  async remove(id: string): Promise<void> {
    const endpoint = await this.findOne(id);
    await this.endpointsRepository.remove(endpoint);
  }

  async seedEndpoints(): Promise<void> {
    this.logger.log('Endpoint seeding işlemi başlatılıyor...');

    const endpoints = [
      // Tenant Management
      {
        path: '/api/platform-admin/tenants',
        method: EndpointMethod.POST,
        controllerName: 'TenantsController',
        actionName: 'create',
        description: 'Yeni tenant oluştur',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants',
        method: EndpointMethod.GET,
        controllerName: 'TenantsController',
        actionName: 'findAll',
        description: 'Tüm tenantları listele',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id',
        method: EndpointMethod.GET,
        controllerName: 'TenantsController',
        actionName: 'findOne',
        description: 'Tenant detayını getir',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/slug/:slug',
        method: EndpointMethod.GET,
        controllerName: 'TenantsController',
        actionName: 'findBySlug',
        description: 'Slug ile tenant bul',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'TenantsController',
        actionName: 'update',
        description: 'Tenant güncelle',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id/status',
        method: EndpointMethod.PATCH,
        controllerName: 'TenantsController',
        actionName: 'updateStatus',
        description: 'Tenant durumunu güncelle',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'TenantsController',
        actionName: 'remove',
        description: 'Tenant sil',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id/debug-keycloak',
        method: EndpointMethod.GET,
        controllerName: 'TenantsController',
        actionName: 'debugKeycloakUser',
        description: 'Tenant Keycloak durumunu debug et',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/tenants/:id/fix-keycloak',
        method: EndpointMethod.PATCH,
        controllerName: 'TenantsController',
        actionName: 'fixKeycloakUser',
        description: 'Tenant Keycloak durumunu düzelt',
        category: EndpointCategory.TENANT_MANAGEMENT,
        requiresAuth: true
      },

      // User Management
      {
        path: '/api/platform-admin/users',
        method: EndpointMethod.POST,
        controllerName: 'PlatformUsersController',
        actionName: 'create',
        description: 'Platform kullanıcısı oluştur',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users',
        method: EndpointMethod.GET,
        controllerName: 'PlatformUsersController',
        actionName: 'findAll',
        description: 'Tüm platform kullanıcılarını listele',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users/:id',
        method: EndpointMethod.GET,
        controllerName: 'PlatformUsersController',
        actionName: 'findOne',
        description: 'Platform kullanıcısı detayını getir',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'PlatformUsersController',
        actionName: 'update',
        description: 'Platform kullanıcısını güncelle',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'PlatformUsersController',
        actionName: 'remove',
        description: 'Platform kullanıcısını sil',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users/:id/role',
        method: EndpointMethod.PATCH,
        controllerName: 'PlatformUsersController',
        actionName: 'updateRole',
        description: 'Kullanıcı rolünü güncelle',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/users/:id/status',
        method: EndpointMethod.PATCH,
        controllerName: 'PlatformUsersController',
        actionName: 'updateStatus',
        description: 'Kullanıcı durumunu güncelle',
        category: EndpointCategory.USER_MANAGEMENT,
        requiresAuth: true
      },

      // Subscription Plans
      {
        path: '/api/platform-admin/subscription-plans',
        method: EndpointMethod.GET,
        controllerName: 'SubscriptionPlansController',
        actionName: 'findAll',
        description: 'Abonelik planlarını listele',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/subscription-plans/:id',
        method: EndpointMethod.GET,
        controllerName: 'SubscriptionPlansController',
        actionName: 'findOne',
        description: 'Abonelik planı detayını getir',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/subscription-plans',
        method: EndpointMethod.POST,
        controllerName: 'SubscriptionPlansController',
        actionName: 'create',
        description: 'Abonelik planı oluştur',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/subscription-plans/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'SubscriptionPlansController',
        actionName: 'update',
        description: 'Abonelik planını güncelle',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/subscription-plans/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'SubscriptionPlansController',
        actionName: 'remove',
        description: 'Abonelik planını sil',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/subscription-plans/:id/status',
        method: EndpointMethod.PATCH,
        controllerName: 'SubscriptionPlansController',
        actionName: 'updateStatus',
        description: 'Abonelik planı durumunu güncelle',
        category: EndpointCategory.SUBSCRIPTION_MANAGEMENT,
        requiresAuth: true
      },

      // Orders
      {
        path: '/api/platform-admin/orders',
        method: EndpointMethod.GET,
        controllerName: 'OrdersController',
        actionName: 'findAll',
        description: 'Siparişleri listele',
        category: EndpointCategory.ORDER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/orders/:id',
        method: EndpointMethod.GET,
        controllerName: 'OrdersController',
        actionName: 'findOne',
        description: 'Sipariş detayını getir',
        category: EndpointCategory.ORDER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/orders/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'OrdersController',
        actionName: 'update',
        description: 'Sipariş güncelle',
        category: EndpointCategory.ORDER_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/orders/:id/status',
        method: EndpointMethod.PATCH,
        controllerName: 'OrdersController',
        actionName: 'updateStatus',
        description: 'Sipariş durumunu güncelle',
        category: EndpointCategory.ORDER_MANAGEMENT,
        requiresAuth: true
      },

      // Products
      {
        path: '/api/platform-admin/products',
        method: EndpointMethod.GET,
        controllerName: 'ProductsController',
        actionName: 'findAll',
        description: 'Ürünleri listele',
        category: EndpointCategory.PRODUCT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/products/:id',
        method: EndpointMethod.GET,
        controllerName: 'ProductsController',
        actionName: 'findOne',
        description: 'Ürün detayını getir',
        category: EndpointCategory.PRODUCT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/products',
        method: EndpointMethod.POST,
        controllerName: 'ProductsController',
        actionName: 'create',
        description: 'Ürün oluştur',
        category: EndpointCategory.PRODUCT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/products/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'ProductsController',
        actionName: 'update',
        description: 'Ürün güncelle',
        category: EndpointCategory.PRODUCT_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/products/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'ProductsController',
        actionName: 'remove',
        description: 'Ürün sil',
        category: EndpointCategory.PRODUCT_MANAGEMENT,
        requiresAuth: true
      },

      // Company Info
      {
        path: '/api/platform-admin/company-info/first',
        method: EndpointMethod.GET,
        controllerName: 'CompanyInfoController',
        actionName: 'findFirst',
        description: 'İlk şirket bilgisini getir',
        category: EndpointCategory.COMPANY_INFO_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/company-info/:id',
        method: EndpointMethod.GET,
        controllerName: 'CompanyInfoController',
        actionName: 'findOne',
        description: 'Şirket bilgisi detayını getir',
        category: EndpointCategory.COMPANY_INFO_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/company-info',
        method: EndpointMethod.POST,
        controllerName: 'CompanyInfoController',
        actionName: 'create',
        description: 'Şirket bilgisi oluştur',
        category: EndpointCategory.COMPANY_INFO_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/company-info/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'CompanyInfoController',
        actionName: 'update',
        description: 'Şirket bilgisini güncelle',
        category: EndpointCategory.COMPANY_INFO_MANAGEMENT,
        requiresAuth: true
      },

      // Email Configs
      {
        path: '/api/platform-admin/email-configs',
        method: EndpointMethod.GET,
        controllerName: 'EmailConfigsController',
        actionName: 'findAll',
        description: 'Email konfigürasyonlarını listele',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/active',
        method: EndpointMethod.GET,
        controllerName: 'EmailConfigsController',
        actionName: 'findActive',
        description: 'Aktif email konfigürasyonunu getir',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/:id',
        method: EndpointMethod.GET,
        controllerName: 'EmailConfigsController',
        actionName: 'findOne',
        description: 'Email konfigürasyon detayını getir',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs',
        method: EndpointMethod.POST,
        controllerName: 'EmailConfigsController',
        actionName: 'create',
        description: 'Email konfigürasyonu oluştur',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/seed-from-env',
        method: EndpointMethod.POST,
        controllerName: 'EmailConfigsController',
        actionName: 'seedFromEnv',
        description: 'Env dosyasından email konfigürasyonu oluştur',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/:id/test',
        method: EndpointMethod.POST,
        controllerName: 'EmailConfigsController',
        actionName: 'testEmailConfig',
        description: 'Email konfigürasyonunu test et',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'EmailConfigsController',
        actionName: 'update',
        description: 'Email konfigürasyonunu güncelle',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/:id/set-active',
        method: EndpointMethod.PATCH,
        controllerName: 'EmailConfigsController',
        actionName: 'setActive',
        description: 'Email konfigürasyonunu aktif yap',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/email-configs/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'EmailConfigsController',
        actionName: 'remove',
        description: 'Email konfigürasyonunu sil',
        category: EndpointCategory.EMAIL_CONFIG_MANAGEMENT,
        requiresAuth: true
      },

      // Industries
      {
        path: '/api/platform-admin/industries',
        method: EndpointMethod.GET,
        controllerName: 'IndustriesController',
        actionName: 'findAll',
        description: 'Sektörleri listele',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/industries/active',
        method: EndpointMethod.GET,
        controllerName: 'IndustriesController',
        actionName: 'findActive',
        description: 'Aktif sektörleri listele',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/industries/:id',
        method: EndpointMethod.GET,
        controllerName: 'IndustriesController',
        actionName: 'findOne',
        description: 'Sektör detayını getir',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/industries',
        method: EndpointMethod.POST,
        controllerName: 'IndustriesController',
        actionName: 'create',
        description: 'Sektör oluştur',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/industries/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'IndustriesController',
        actionName: 'update',
        description: 'Sektör güncelle',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/industries/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'IndustriesController',
        actionName: 'remove',
        description: 'Sektör sil',
        category: EndpointCategory.INDUSTRY_MANAGEMENT,
        requiresAuth: true
      },

      // Analytics
      {
        path: '/api/platform-admin/analytics/dashboard-stats',
        method: EndpointMethod.GET,
        controllerName: 'AnalyticsController',
        actionName: 'getDashboardStats',
        description: 'Dashboard istatistiklerini getir',
        category: EndpointCategory.ANALYTICS,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/analytics/recent-activities',
        method: EndpointMethod.GET,
        controllerName: 'AnalyticsController',
        actionName: 'getRecentActivities',
        description: 'Son aktiviteleri getir',
        category: EndpointCategory.ANALYTICS,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/analytics/revenue-trend',
        method: EndpointMethod.GET,
        controllerName: 'AnalyticsController',
        actionName: 'getRevenueTrend',
        description: 'Aylık gelir trendini getir',
        category: EndpointCategory.ANALYTICS,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/analytics/user-growth-trend',
        method: EndpointMethod.GET,
        controllerName: 'AnalyticsController',
        actionName: 'getUserGrowthTrend',
        description: 'Kullanıcı artış trendini getir',
        category: EndpointCategory.ANALYTICS,
        requiresAuth: true
      },

      // Support
      {
        path: '/support',
        method: EndpointMethod.GET,
        controllerName: 'SupportController',
        actionName: 'findAll',
        description: 'Destek taleplerini listele',
        category: EndpointCategory.SUPPORT,
        requiresAuth: true
      },
      {
        path: '/support/:id',
        method: EndpointMethod.GET,
        controllerName: 'SupportController',
        actionName: 'findOne',
        description: 'Destek talebi detayını getir',
        category: EndpointCategory.SUPPORT,
        requiresAuth: true
      },

      // Contact Messages Management
      {
        path: '/api/platform-admin/contact-messages',
        method: EndpointMethod.GET,
        controllerName: 'ContactMessagesController',
        actionName: 'findAll',
        description: 'İletişim mesajlarını listele',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/stats',
        method: EndpointMethod.GET,
        controllerName: 'ContactMessagesController',
        actionName: 'getStats',
        description: 'Mesaj istatistiklerini getir',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/unread-count',
        method: EndpointMethod.GET,
        controllerName: 'ContactMessagesController',
        actionName: 'getUnreadCount',
        description: 'Okunmamış mesaj sayısını getir',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/:id',
        method: EndpointMethod.GET,
        controllerName: 'ContactMessagesController',
        actionName: 'findOne',
        description: 'Mesaj detayını getir',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'ContactMessagesController',
        actionName: 'update',
        description: 'Mesajı güncelle',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/:id/mark-read',
        method: EndpointMethod.PATCH,
        controllerName: 'ContactMessagesController',
        actionName: 'markAsRead',
        description: 'Mesajı okundu olarak işaretle',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/:id/mark-replied',
        method: EndpointMethod.PATCH,
        controllerName: 'ContactMessagesController',
        actionName: 'markAsReplied',
        description: 'Mesajı cevaplandı olarak işaretle',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/contact-messages/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'ContactMessagesController',
        actionName: 'remove',
        description: 'Mesajı sil',
        category: EndpointCategory.CONTACT_MESSAGES,
        requiresAuth: true
      },

      // Iyzipay Management
      {
        path: '/api/platform-admin/iyzipay-info',
        method: EndpointMethod.GET,
        controllerName: 'IyzipayInfoController',
        actionName: 'findAll',
        description: 'Iyzipay bilgilerini listele',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/active',
        method: EndpointMethod.GET,
        controllerName: 'IyzipayInfoController',
        actionName: 'findActive',
        description: 'Aktif Iyzipay konfigürasyonunu getir',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/test-connection',
        method: EndpointMethod.GET,
        controllerName: 'IyzipayInfoController',
        actionName: 'testConnection',
        description: 'Iyzipay bağlantısını test et',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/installments',
        method: EndpointMethod.GET,
        controllerName: 'IyzipayInfoController',
        actionName: 'getAvailableInstallments',
        description: 'Kullanılabilir taksit seçeneklerini getir',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/:id',
        method: EndpointMethod.GET,
        controllerName: 'IyzipayInfoController',
        actionName: 'findOne',
        description: 'Iyzipay bilgisi detayını getir',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info',
        method: EndpointMethod.POST,
        controllerName: 'IyzipayInfoController',
        actionName: 'create',
        description: 'Yeni Iyzipay konfigürasyonu oluştur',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/calculate-installments',
        method: EndpointMethod.POST,
        controllerName: 'IyzipayInfoController',
        actionName: 'calculateInstallments',
        description: 'Taksit bilgilerini hesapla',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/process-payment',
        method: EndpointMethod.POST,
        controllerName: 'IyzipayInfoController',
        actionName: 'processPayment',
        description: 'Ödeme işlemini gerçekleştir',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'IyzipayInfoController',
        actionName: 'update',
        description: 'Iyzipay konfigürasyonunu güncelle',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/:id/set-active',
        method: EndpointMethod.PATCH,
        controllerName: 'IyzipayInfoController',
        actionName: 'setActive',
        description: 'Iyzipay konfigürasyonunu aktif yap',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/iyzipay-info/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'IyzipayInfoController',
        actionName: 'remove',
        description: 'Iyzipay konfigürasyonunu sil',
        category: EndpointCategory.IYZIPAY_MANAGEMENT,
        requiresAuth: true
      },

      // Role Permissions Management
      {
        path: '/api/platform-admin/role-permissions',
        method: EndpointMethod.GET,
        controllerName: 'RolePermissionsController',
        actionName: 'findAll',
        description: 'Tüm rol izinlerini listele',
        category: EndpointCategory.ROLE_PERMISSIONS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/role-permissions/matrix',
        method: EndpointMethod.GET,
        controllerName: 'RolePermissionsController',
        actionName: 'getMatrix',
        description: 'Rol izin matrisi görünümü',
        category: EndpointCategory.ROLE_PERMISSIONS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/role-permissions/bulk-update',
        method: EndpointMethod.POST,
        controllerName: 'RolePermissionsController',
        actionName: 'bulkUpdate',
        description: 'Toplu izin güncelleme',
        category: EndpointCategory.ROLE_PERMISSIONS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/role-permissions/role/:role/permissions',
        method: EndpointMethod.GET,
        controllerName: 'RolePermissionsController',
        actionName: 'getPermissionsByRole',
        description: 'Role göre izinleri getir',
        category: EndpointCategory.ROLE_PERMISSIONS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/role-permissions/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'RolePermissionsController',
        actionName: 'update',
        description: 'Rol izin güncelleme',
        category: EndpointCategory.ROLE_PERMISSIONS_MANAGEMENT,
        requiresAuth: true
      },

      // Endpoints Management
      {
        path: '/api/platform-admin/endpoints',
        method: EndpointMethod.GET,
        controllerName: 'EndpointsController',
        actionName: 'findAll',
        description: 'Endpoint\'leri listele',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/endpoints/seed',
        method: EndpointMethod.POST,
        controllerName: 'EndpointsController',
        actionName: 'seedEndpoints',
        description: 'Endpoint\'leri seed et',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/endpoints/:id',
        method: EndpointMethod.GET,
        controllerName: 'EndpointsController',
        actionName: 'findOne',
        description: 'Endpoint detayı',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/endpoints',
        method: EndpointMethod.POST,
        controllerName: 'EndpointsController',
        actionName: 'create',
        description: 'Endpoint oluştur',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/endpoints/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'EndpointsController',
        actionName: 'update',
        description: 'Endpoint güncelle',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/endpoints/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'EndpointsController',
        actionName: 'remove',
        description: 'Endpoint sil',
        category: EndpointCategory.ENDPOINTS_MANAGEMENT,
        requiresAuth: true
      },

      // Corporate Pages Management
      {
        path: '/api/platform-admin/corporate-pages',
        method: EndpointMethod.GET,
        controllerName: 'CorporatePagesController',
        actionName: 'findAll',
        description: 'Kurumsal sayfaları listele',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/corporate-pages/:id',
        method: EndpointMethod.GET,
        controllerName: 'CorporatePagesController',
        actionName: 'findOne',
        description: 'Kurumsal sayfa detayını getir',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/corporate-pages',
        method: EndpointMethod.POST,
        controllerName: 'CorporatePagesController',
        actionName: 'create',
        description: 'Kurumsal sayfa oluştur',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/corporate-pages/:id',
        method: EndpointMethod.PATCH,
        controllerName: 'CorporatePagesController',
        actionName: 'update',
        description: 'Kurumsal sayfa güncelle',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/corporate-pages/:id',
        method: EndpointMethod.DELETE,
        controllerName: 'CorporatePagesController',
        actionName: 'remove',
        description: 'Kurumsal sayfa sil',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },
      {
        path: '/api/platform-admin/corporate-pages/initialize-defaults',
        method: EndpointMethod.POST,
        controllerName: 'CorporatePagesController',
        actionName: 'initializeDefaults',
        description: 'Varsayılan kurumsal sayfaları oluştur',
        category: EndpointCategory.CORPORATE_PAGES_MANAGEMENT,
        requiresAuth: true
      },

      // System Initialization
      {
        path: '/admin/initialization/roles/reinitialize',
        method: EndpointMethod.POST,
        controllerName: 'InitializationController',
        actionName: 'reinitializeRoles',
        description: 'Rolleri yeniden başlat',
        category: EndpointCategory.SYSTEM_INITIALIZATION,
        requiresAuth: true
      }
    ];

    for (const endpointData of endpoints) {
      const existing = await this.endpointsRepository.findOne({
        where: {
          path: endpointData.path,
          method: endpointData.method
        }
      });

      if (!existing) {
        const endpoint = this.endpointsRepository.create(endpointData);
        await this.endpointsRepository.save(endpoint);
        this.logger.log(`Endpoint eklendi: ${endpointData.method} ${endpointData.path}`);
      }
    }

    this.logger.log('Endpoint seeding işlemi tamamlandı');
  }
} 