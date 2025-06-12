import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantStatus } from '../tenants/entities/tenant-metadata.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { SubscriptionPlan } from '../subscription-plans/entities/subscription-plan.entity';
import { PlatformUser } from '../platform-users/entities/platform-user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(PlatformUser)
    private platformUserRepository: Repository<PlatformUser>,
  ) { }

  async getDashboardStats() {
    // Temel istatistikler
    const totalTenants = await this.tenantRepository.count();
    const activeTenants = await this.tenantRepository.count({
      where: { status: TenantStatus.ACTIVE }
    });

    const totalOrders = await this.orderRepository.count();
    const paidOrders = await this.orderRepository.count({
      where: { isPaid: true }
    });

    const totalSubscriptions = await this.subscriptionPlanRepository.count();
    const totalUsers = await this.platformUserRepository.count();

    // Gelir hesaplamaları
    const totalRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.isPaid = :isPaid', { isPaid: true })
      .getRawOne();

    const monthlyRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.isPaid = :isPaid', { isPaid: true })
      .andWhere('order.createdAt >= :startDate', {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      })
      .getRawOne();

    // Bekleyen ödemeler
    const pendingPayments = await this.orderRepository.count({
      where: { isPaid: false, status: OrderStatus.PROCESSING }
    });

    // Son 12 aylık trend
    const monthlyTrend = await this.getMonthlyRevenueTrend();
    const userGrowthTrend = await this.getUserGrowthTrend();

    return {
      totalTenants,
      activeTenants,
      activeSubscriptions: activeTenants, // Aktif kiracı = aktif abonelik
      totalOrders,
      paidOrders,
      totalRevenue: parseFloat(totalRevenueResult?.total || '0'),
      monthlyRevenue: parseFloat(monthlyRevenueResult?.total || '0'),
      pendingPayments,
      totalUsers,
      monthlyTrend,
      userGrowthTrend,
      // Yüzde hesaplamaları
      revenueGrowth: await this.calculateRevenueGrowth(),
      tenantGrowth: await this.calculateTenantGrowth(),
      subscriptionGrowth: await this.calculateSubscriptionGrowth(),
    };
  }

  async getMonthlyRevenueTrend() {
    const currentDate = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const revenue = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.isPaid = :isPaid', { isPaid: true })
        .andWhere('order.createdAt >= :startDate', { startDate: date })
        .andWhere('order.createdAt <= :endDate', { endDate })
        .getRawOne();

      months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(revenue?.total || '0'),
        date: date.toISOString()
      });
    }

    return months;
  }

  async getUserGrowthTrend() {
    const currentDate = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const tenantCount = await this.tenantRepository
        .createQueryBuilder('tenant')
        .where('tenant.createdAt <= :endDate', { endDate })
        .getCount();

      months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        users: tenantCount,
        date: date.toISOString()
      });
    }

    return months;
  }

  async getRecentActivities() {
    // Son siparişler
    const recentOrders = await this.orderRepository
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC')
      .limit(5)
      .getMany();

    // Son kiracılar
    const recentTenants = await this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.metadata', 'metadata')
      .orderBy('tenant.createdAt', 'DESC')
      .limit(3)
      .getMany();

    const activities = [];

    // Siparişleri ekle
    recentOrders.forEach(order => {
      activities.push({
        type: order.isPaid ? 'payment' : 'order',
        title: order.isPaid
          ? `Ödeme alındı: ${order.companyName || order.getFullName()}`
          : `Yeni sipariş: ${order.companyName || order.getFullName()}`,
        description: `₺${order.total} - ${order.email}`,
        time: this.getRelativeTime(order.createdAt),
        timestamp: order.createdAt
      });
    });

    // Kiracıları ekle
    recentTenants.forEach(tenant => {
      activities.push({
        type: 'tenant',
        title: `Yeni kiracı kaydı: ${tenant.name}`,
        description: tenant.metadata?.email || tenant.metadata?.companyName || '',
        time: this.getRelativeTime(tenant.createdAt),
        timestamp: tenant.createdAt
      });
    });

    // Zamana göre sırala
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  private async calculateRevenueGrowth(): Promise<number> {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const [currentRevenue, lastRevenue] = await Promise.all([
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.isPaid = :isPaid', { isPaid: true })
        .andWhere('order.createdAt >= :startDate', { startDate: currentMonthStart })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.isPaid = :isPaid', { isPaid: true })
        .andWhere('order.createdAt >= :startDate', { startDate: lastMonth })
        .andWhere('order.createdAt < :endDate', { endDate: currentMonthStart })
        .getRawOne()
    ]);

    const current = parseFloat(currentRevenue?.total || '0');
    const last = parseFloat(lastRevenue?.total || '0');

    if (last === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - last) / last) * 100);
  }

  private async calculateTenantGrowth(): Promise<number> {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const [currentCount, lastCount] = await Promise.all([
      this.tenantRepository
        .createQueryBuilder('tenant')
        .where('tenant.createdAt >= :startDate', { startDate: currentMonthStart })
        .getCount(),
      this.tenantRepository
        .createQueryBuilder('tenant')
        .where('tenant.createdAt >= :startDate', { startDate: lastMonth })
        .andWhere('tenant.createdAt < :endDate', { endDate: currentMonthStart })
        .getCount()
    ]);

    if (lastCount === 0) return currentCount > 0 ? 100 : 0;
    return Math.round(((currentCount - lastCount) / lastCount) * 100);
  }

  private async calculateSubscriptionGrowth(): Promise<number> {
    // Bu basitleştirilmiş bir hesaplama - aktif abonelik sayısındaki artış
    return await this.calculateTenantGrowth();
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Az önce';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;

    return date.toLocaleDateString('tr-TR');
  }
}
