import { Controller, Post, Get, Body, Param, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PublicOrdersService, PublicOrderRequest, PublicOrderResponse } from './public-orders.service';
import { PublicTenantAuthService } from './public-tenant-auth.service';

@Controller('public/orders')
export class PublicOrdersController {
  constructor(
    private readonly publicOrdersService: PublicOrdersService,
    private readonly tenantAuthService: PublicTenantAuthService,
  ) { }

  /**
   * Yeni sipariş oluştur - anonymous veya tenant
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() orderRequest: PublicOrderRequest,
    @Headers('authorization') authHeader?: string
  ): Promise<PublicOrderResponse> {
    // Eğer tenant token'ı varsa verify et
    if (authHeader && authHeader.startsWith('Bearer ') && orderRequest.orderType === 'tenant') {
      const token = authHeader.substring(7);
      const tenantProfile = await this.tenantAuthService.getTenantFromToken(token);

      if (tenantProfile) {
        orderRequest.tenantId = tenantProfile.id;
      }
    }

    return await this.publicOrdersService.createOrder(orderRequest);
  }

  /**
   * Sipariş durumu sorgula
   */
  @Get('status/:orderNumber')
  async getOrderStatus(@Param('orderNumber') orderNumber: string) {
    const order = await this.publicOrdersService.getOrderStatus(orderNumber);

    if (!order) {
      return {
        success: false,
        message: 'Sipariş bulunamadı'
      };
    }

    return {
      success: true,
      message: 'Sipariş bilgileri başarıyla getirildi',
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        isPaid: order.isPaid,
        isTenantProvisioned: order.isTenantProvisioned,
        trackingNumber: order.trackingNumber
      }
    };
  }

  /**
   * Tenant siparişlerini getir (authenticated)
   */
  @Get('my-orders')
  async getMyOrders(
    @Headers('authorization') authHeader: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        message: 'Yetkilendirme tokeni gerekli'
      };
    }

    const token = authHeader.substring(7);
    const tenantProfile = await this.tenantAuthService.getTenantFromToken(token);

    if (!tenantProfile) {
      return {
        success: false,
        message: 'Geçersiz token'
      };
    }

    const orders = await this.publicOrdersService.getTenantOrders(tenantProfile.id, page, limit);

    return {
      success: true,
      message: 'Siparişleriniz başarıyla getirildi',
      ...orders
    };
  }
} 