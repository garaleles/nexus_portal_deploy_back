import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrdersService } from '../platform-admin/orders/orders.service';
import { CreateOrderDto } from '../platform-admin/orders/dto/create-order.dto';
import { Order, PaymentMethod, OrderStatus } from '../platform-admin/orders/entities/order.entity';
import { PublicTenantAuthService } from './public-tenant-auth.service';
import { EmailNotificationService, OrderEmailData } from '../../shared/services/email-notification.service';
import { CompanyInfoService } from '../platform-admin/company-info/company-info.service';

export interface PublicOrderRequest {
  orderType: 'anonymous' | 'tenant';
  tenantId?: string;
  customerInfo: {
    companyName: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    taxOffice: string;
    taxNumber: string;
    address: string;
    district: string;
    city: string;
    industryId?: string;
  };
  paymentMethod: 'bank_transfer' | 'credit_card';
  paymentDetails?: {
    paymentId?: string;
    conversationId?: string;
    installment?: number;
    cardType?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  taxPrice: number;
  total: number;
  notes?: string;
}

export interface PublicOrderResponse {
  success: boolean;
  message: string;
  order?: {
    id: string;
    orderNumber: string;
    customerInfo: any;
    paymentMethod: string;
    total: number;
    status: string;
    createdAt: Date;
  };
}

@Injectable()
export class PublicOrdersService {
  private readonly logger = new Logger(PublicOrdersService.name);

  constructor(
    private ordersService: OrdersService,
    private tenantAuthService: PublicTenantAuthService,
    private emailNotificationService: EmailNotificationService,
    private companyInfoService: CompanyInfoService,
  ) { }

  /**
   * Public sipariş oluşturma - anonymous veya tenant
   */
  async createOrder(orderRequest: PublicOrderRequest): Promise<PublicOrderResponse> {
    try {
      this.logger.log(`Creating ${orderRequest.orderType} order for ${orderRequest.customerInfo.email}`);

      // Sipariş numarası oluştur
      const orderNumber = this.ordersService.generateOrderNumber();

      // Payment method dönüşümü
      const paymentMethod = orderRequest.paymentMethod === 'bank_transfer'
        ? PaymentMethod.BANK
        : PaymentMethod.CREDIT_CARD;

      // Mevcut CreateOrderDto formatına dönüştür
      const createOrderDto: CreateOrderDto = {
        orderNumber,
        companyName: orderRequest.customerInfo.companyName,
        firstName: orderRequest.customerInfo.firstName,
        lastName: orderRequest.customerInfo.lastName,
        phone: orderRequest.customerInfo.phone,
        email: orderRequest.customerInfo.email,
        taxOffice: orderRequest.customerInfo.taxOffice,
        taxNumber: orderRequest.customerInfo.taxNumber,
        industryId: orderRequest.customerInfo.industryId,
        address: orderRequest.customerInfo.address,
        city: orderRequest.customerInfo.city,
        district: orderRequest.customerInfo.district,
        orderItems: orderRequest.items,
        paymentMethod,
        taxPrice: orderRequest.taxPrice,
        subtotal: orderRequest.subtotal,
        total: orderRequest.total,
        status: OrderStatus.PROCESSING,
        isPaid: orderRequest.paymentMethod === 'credit_card', // Kredi kartı ödemesi ise paid olarak işaretle
        isDelivered: false,
        notes: orderRequest.notes || (orderRequest.paymentDetails ?
          `Ödeme ID: ${orderRequest.paymentDetails.paymentId}, İşlem ID: ${orderRequest.paymentDetails.conversationId}` :
          undefined)
      };

      // Siparişi oluştur
      const order = await this.ordersService.create(createOrderDto);

      this.logger.log(`Order created successfully: ${order.orderNumber}`);

      // E-posta bildirimlerini gönder
      await this.sendOrderNotifications(order, orderRequest);

      return {
        success: true,
        message: 'Sipariş başarıyla oluşturuldu',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerInfo: {
            companyName: order.companyName,
            firstName: order.firstName,
            lastName: order.lastName,
            email: order.email,
            phone: order.phone
          },
          paymentMethod: order.paymentMethod,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt
        }
      };

    } catch (error) {
      this.logger.error(`Order creation failed for ${orderRequest.customerInfo.email}:`, error.message);

      throw new BadRequestException({
        success: false,
        message: 'Sipariş oluşturulurken hata oluştu: ' + error.message
      });
    }
  }

  /**
   * Sipariş durumu sorgulama
   */
  async getOrderStatus(orderNumber: string): Promise<Order | null> {
    try {
      // Doğrudan findByOrderNumber metodunu kullan
      const order = await this.ordersService.findByOrderNumber(orderNumber);
      return order;
    } catch (error) {
      this.logger.error(`Order status check failed for ${orderNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Tenant siparişlerini getir
   */
  async getTenantOrders(tenantId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      // Tenant'ın email'ini al
      const tenant = await this.tenantAuthService.getTenantFromToken(tenantId);

      if (!tenant) {
        throw new BadRequestException('Tenant bulunamadı');
      }

      // Email ile siparişleri ara
      const orders = await this.ordersService.findAll({
        search: tenant.email,
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      return orders;
    } catch (error) {
      this.logger.error(`Tenant orders fetch failed for ${tenantId}:`, error.message);
      throw new BadRequestException('Tenant siparişleri alınırken hata oluştu');
    }
  }

  /**
   * Sipariş e-posta bildirimlerini gönder
   */
  private async sendOrderNotifications(order: Order, orderRequest: PublicOrderRequest): Promise<void> {
    try {
      // E-posta verilerini hazırla
      const emailData: OrderEmailData = {
        orderNumber: order.orderNumber,
        customerName: `${order.firstName} ${order.lastName}`,
        customerEmail: order.email,
        companyName: order.companyName,
        total: order.total,
        paymentMethod: orderRequest.paymentMethod,
        items: orderRequest.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        paymentDetails: orderRequest.paymentDetails
      };

      // Sipariş onay e-postası gönder
      await this.emailNotificationService.sendOrderConfirmationEmail(emailData);

      // Ödeme yöntemine göre ek e-postalar gönder
      if (orderRequest.paymentMethod === 'bank_transfer') {
        // Banka bilgilerini al
        try {
          const companyInfo = await this.companyInfoService.findFirst();
          if (companyInfo && companyInfo.bank1Name) {
            emailData.bankInfo = {
              bankName: companyInfo.bank1Name,
              accountHolder: companyInfo.bank1AccountHolder,
              iban: companyInfo.bank1IBAN,
              accountNumber: companyInfo.bank1AccountNumber
            };

            // Banka havalesi bilgileri e-postası gönder
            await this.emailNotificationService.sendBankTransferEmail(emailData);
          }
        } catch (error) {
          this.logger.warn(`Failed to send bank transfer email for order ${order.orderNumber}:`, error);
        }
      } else if (orderRequest.paymentMethod === 'credit_card') {
        // Kredi kartı ödeme onayı e-postası gönder
        await this.emailNotificationService.sendCreditCardPaymentEmail(emailData);
      }

      this.logger.log(`Email notifications sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send email notifications for order ${order.orderNumber}:`, error);
      // E-posta hatası sipariş oluşturma işlemini durdurmasın
    }
  }
} 