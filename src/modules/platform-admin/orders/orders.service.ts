import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { TenantMetadata } from '../tenants/entities/tenant-metadata.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(TenantMetadata)
    private tenantMetadataRepository: Repository<TenantMetadata>,
  ) { }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Sipariş numarası kontrolü
    const existingOrder = await this.orderRepository.findOne({
      where: { orderNumber: createOrderDto.orderNumber }
    });

    if (existingOrder) {
      throw new BadRequestException('Bu sipariş numarası zaten mevcut');
    }

    // Sipariş oluştur
    const order = this.orderRepository.create({
      ...createOrderDto,
      orderItems: [] // Önce boş olarak oluştur
    });

    const savedOrder = await this.orderRepository.save(order);

    // Sipariş kalemlerini oluştur
    if (createOrderDto.orderItems && createOrderDto.orderItems.length > 0) {
      const orderItems = createOrderDto.orderItems.map(item =>
        this.orderItemRepository.create({
          ...item,
          orderId: savedOrder.id
        })
      );

      await this.orderItemRepository.save(orderItems);
    }

    return this.findOne(savedOrder.id);
  }

  async findAll(filterDto: OrderFilterDto) {
    const {
      search,
      status,
      paymentMethod,
      isPaid,
      isTenantProvisioned,
      tenantProvisioningStatus,
      city,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filterDto;

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .leftJoinAndSelect('product.subscriptionPlan', 'subscriptionPlan')
      .leftJoinAndSelect('orderItems.subscriptionPlan', 'orderItemSubscriptionPlan');

    // Arama
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber ILIKE :search OR order.firstName ILIKE :search OR order.lastName ILIKE :search OR order.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Durum filtresi
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Ödeme yöntemi filtresi
    if (paymentMethod) {
      queryBuilder.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
    }

    // Ödeme durumu filtresi
    if (isPaid !== undefined) {
      queryBuilder.andWhere('order.isPaid = :isPaid', { isPaid });
    }

    // Tenant provisioning durumu filtresi
    if (isTenantProvisioned !== undefined) {
      queryBuilder.andWhere('order.isTenantProvisioned = :isTenantProvisioned', { isTenantProvisioned });
    }

    // Tenant provisioning status filtresi
    if (tenantProvisioningStatus) {
      queryBuilder.andWhere('order.tenantProvisioningStatus = :tenantProvisioningStatus', { tenantProvisioningStatus });
    }

    // Şehir filtresi
    if (city) {
      queryBuilder.andWhere('order.city ILIKE :city', { city: `%${city}%` });
    }

    // Tarih aralığı filtresi
    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    }

    // Tutar aralığı filtresi
    if (minTotal !== undefined) {
      queryBuilder.andWhere('order.total >= :minTotal', { minTotal });
    }

    if (maxTotal !== undefined) {
      queryBuilder.andWhere('order.total <= :maxTotal', { maxTotal });
    }

    // Sıralama
    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);

    // Sayfalama
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    // Her sipariş için tenant durumunu kontrol et
    const ordersWithTenantStatus = await Promise.all(
      orders.map(async (order) => {
        const tenantExists = await this.checkIfTenantExists(order.email);
        // Order entity'sinin metodlarını korumak için doğrudan ekliyoruz
        (order as any).hasExistingTenant = tenantExists;
        return order;
      })
    );

    return {
      data: ordersWithTenantStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['orderItems', 'orderItems.product', 'orderItems.product.subscriptionPlan', 'orderItems.subscriptionPlan']
    });

    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['orderItems', 'orderItems.product', 'orderItems.product.subscriptionPlan', 'orderItems.subscriptionPlan']
    });

    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    // Ödeme durumu değiştiriliyorsa
    if (updateOrderDto.isPaid !== undefined && updateOrderDto.isPaid !== order.isPaid) {
      if (updateOrderDto.isPaid) {
        updateOrderDto.paidAt = new Date();
      } else {
        updateOrderDto.paidAt = null;
      }
    }

    // Tenant provisioning durumu değiştiriliyorsa
    if (updateOrderDto.isTenantProvisioned !== undefined && updateOrderDto.isTenantProvisioned !== order.isTenantProvisioned) {
      if (updateOrderDto.isTenantProvisioned) {
        updateOrderDto.tenantProvisionedAt = new Date();
        updateOrderDto.status = OrderStatus.DELIVERED; // "Aktive Edildi" anlamında
      } else {
        updateOrderDto.tenantProvisionedAt = null;
      }
    }

    await this.orderRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);

    const updateData: Partial<Order> = { status };

    // Durum değişikliklerine göre otomatik güncellemeler
    if (status === OrderStatus.DELIVERED) {
      updateData.isTenantProvisioned = true;
      updateData.tenantProvisionedAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.isTenantProvisioned = false;
      updateData.tenantProvisionedAt = null;
    }

    await this.orderRepository.update(id, updateData);
    return this.findOne(id);
  }

  async markAsPaid(id: string, paymentResult?: any): Promise<Order> {
    const updateData: Partial<Order> = {
      isPaid: true,
      paidAt: new Date()
    };

    if (paymentResult) {
      updateData.paymentResult = paymentResult;
    }

    await this.orderRepository.update(id, updateData);
    return this.findOne(id);
  }

  async markAsTenantProvisioned(id: string, tenantId?: string, tenantProvisioningStatus?: string, trackingNumber?: string): Promise<Order> {
    const updateData: Partial<Order> = {
      isTenantProvisioned: true,
      tenantProvisionedAt: new Date(),
      status: OrderStatus.DELIVERED // "Aktive Edildi" anlamında
    };

    if (tenantId) {
      updateData.tenantId = tenantId;
    }

    if (tenantProvisioningStatus) {
      updateData.tenantProvisioningStatus = tenantProvisioningStatus as any;
    }

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    await this.orderRepository.update(id, updateData);
    return this.findOne(id);
  }

  async markAsTenantProvisionedByOrderNumber(orderNumber: string, tenantId?: string, tenantProvisioningStatus?: string, trackingNumber?: string): Promise<Order> {
    const order = await this.findByOrderNumber(orderNumber);
    return this.markAsTenantProvisioned(order.id, tenantId, tenantProvisioningStatus, trackingNumber);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }

  async getOrderStatistics() {
    const totalOrders = await this.orderRepository.count();
    const paidOrders = await this.orderRepository.count({ where: { isPaid: true } });
    const provisionedOrders = await this.orderRepository.count({ where: { isTenantProvisioned: true } });
    const processingOrders = await this.orderRepository.count({ where: { status: OrderStatus.PROCESSING } });

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.isPaid = :isPaid', { isPaid: true })
      .getRawOne();

    return {
      totalOrders,
      paidOrders,
      provisionedOrders,
      processingOrders,
      totalRevenue: parseFloat(totalRevenue?.total || '0')
    };
  }

  // Sipariş numarası oluşturma helper'ı
  generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Email adresine göre tenant'ın var olup olmadığını kontrol eder
   */
  private async checkIfTenantExists(email: string): Promise<boolean> {
    try {
      const tenant = await this.tenantMetadataRepository.findOne({
        where: { email }
      });
      return !!tenant;
    } catch (error) {
      console.error('Tenant check error:', error);
      return false;
    }
  }
} 