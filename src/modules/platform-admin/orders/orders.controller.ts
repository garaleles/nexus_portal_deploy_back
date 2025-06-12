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
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrderStatus } from './entities/order.entity';
import { KeycloakAuthGuard } from '@core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '@core/auth/guards/enhanced-roles.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('platform-admin/orders')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Yeni sipariş oluştur' })
  @ApiResponse({ status: 201, description: 'Sipariş başarıyla oluşturuldu' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    // Eğer sipariş numarası verilmemişse otomatik oluştur
    if (!createOrderDto.orderNumber) {
      createOrderDto.orderNumber = this.ordersService.generateOrderNumber();
    }

    const order = await this.ordersService.create(createOrderDto);

    return {
      success: true,
      message: 'Sipariş başarıyla oluşturuldu',
      data: order
    };
  }

  @Get()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Tüm siparişleri listele' })
  @ApiResponse({ status: 200, description: 'Siparişler başarıyla listelendi' })
  async findAll(@Query() filterDto: OrderFilterDto) {
    const result = await this.ordersService.findAll(filterDto);

    return {
      success: true,
      message: 'Siparişler başarıyla listelendi',
      ...result
    };
  }

  @Get('statistics')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Sipariş istatistiklerini getir' })
  @ApiResponse({ status: 200, description: 'İstatistikler başarıyla getirildi' })
  async getStatistics() {
    const statistics = await this.ordersService.getOrderStatistics();

    return {
      success: true,
      message: 'İstatistikler başarıyla getirildi',
      data: statistics
    };
  }

  @Get('order-number/:orderNumber')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Sipariş numarasına göre sipariş getir' })
  @ApiResponse({ status: 200, description: 'Sipariş başarıyla bulundu' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findByOrderNumber(orderNumber);

    return {
      success: true,
      message: 'Sipariş başarıyla bulundu',
      data: order
    };
  }

  @Get(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'ID ile sipariş getir' })
  @ApiResponse({ status: 200, description: 'Sipariş başarıyla bulundu' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findOne(id);

    return {
      success: true,
      message: 'Sipariş başarıyla bulundu',
      data: order
    };
  }

  @Patch(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Siparişi güncelle' })
  @ApiResponse({ status: 200, description: 'Sipariş başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto
  ) {
    const order = await this.ordersService.update(id, updateOrderDto);

    return {
      success: true,
      message: 'Sipariş başarıyla güncellendi',
      data: order
    };
  }

  @Patch(':id/status')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Sipariş durumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Sipariş durumu başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus
  ) {
    const order = await this.ordersService.updateStatus(id, status);

    return {
      success: true,
      message: 'Sipariş durumu başarıyla güncellendi',
      data: order
    };
  }

  @Patch(':id/mark-paid')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Siparişi ödendi olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Sipariş ödendi olarak işaretlendi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('paymentResult') paymentResult?: any
  ) {
    const order = await this.ordersService.markAsPaid(id, paymentResult);

    return {
      success: true,
      message: 'Sipariş ödendi olarak işaretlendi',
      data: order
    };
  }

  @Patch(':id/mark-tenant-provisioned')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Siparişi tenant provisioned olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Sipariş tenant provisioned olarak işaretlendi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async markAsTenantProvisioned(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { tenantId?: string; tenantProvisioningStatus?: string; trackingNumber?: string }
  ) {
    const order = await this.ordersService.markAsTenantProvisioned(id, body.tenantId, body.tenantProvisioningStatus, body.trackingNumber);

    return {
      success: true,
      message: 'Sipariş tenant provisioned olarak işaretlendi',
      data: order
    };
  }

  @Patch('order-number/:orderNumber/mark-tenant-provisioned')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Sipariş numarasına göre siparişi tenant provisioned olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Sipariş tenant provisioned olarak işaretlendi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async markAsTenantProvisionedByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { tenantId?: string; tenantProvisioningStatus?: string; trackingNumber?: string }
  ) {
    const order = await this.ordersService.markAsTenantProvisionedByOrderNumber(orderNumber, body.tenantId, body.tenantProvisioningStatus, body.trackingNumber);

    return {
      success: true,
      message: 'Sipariş tenant provisioned olarak işaretlendi',
      data: order
    };
  }

  @Delete(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Siparişi sil' })
  @ApiResponse({ status: 204, description: 'Sipariş başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ordersService.remove(id);

    return {
      success: true,
      message: 'Sipariş başarıyla silindi'
    };
  }

  @Post('generate-order-number')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Yeni sipariş numarası oluştur' })
  @ApiResponse({ status: 200, description: 'Sipariş numarası oluşturuldu' })
  generateOrderNumber() {
    const orderNumber = this.ordersService.generateOrderNumber();

    return {
      success: true,
      message: 'Sipariş numarası oluşturuldu',
      data: { orderNumber }
    };
  }

  @Get('debug/:id')
  @ApiOperation({ summary: 'Debug: Get order with full relations' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async debugOrder(@Param('id') id: string) {
    try {
      const order = await this.ordersService.findOne(id);

      // Debug için detaylı bilgi
      console.log('🔍 DEBUG - Order:', {
        id: order.id,
        orderNumber: order.orderNumber,
        orderItemsCount: order.orderItems?.length || 0
      });

      if (order.orderItems) {
        order.orderItems.forEach((item, index) => {
          console.log(`📦 DEBUG - Order Item ${index + 1}:`, {
            name: item.name,
            productId: item.productId,
            hasProduct: !!item.product,
            productName: item.product?.name,
            hasSubscriptionPlan: !!item.product?.subscriptionPlan,
            subscriptionPlanId: item.product?.subscriptionPlan?.id,
            subscriptionPlanName: item.product?.subscriptionPlan?.name
          });
        });
      }

      return {
        success: true,
        message: 'Debug order retrieved successfully',
        data: order
      };
    } catch (error) {
      console.error('❌ DEBUG - Error:', error);
      throw error;
    }
  }
} 