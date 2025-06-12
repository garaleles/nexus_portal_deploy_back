import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@ApiTags('Platform Analitikleri')
@Controller('platform-admin/analytics')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Dashboard istatistiklerini getir' })
  @ApiResponse({ status: 200, description: 'Dashboard istatistikleri başarıyla getirildi' })
  async getDashboardStats() {
    const stats = await this.analyticsService.getDashboardStats();

    return {
      success: true,
      message: 'Dashboard istatistikleri başarıyla getirildi',
      data: stats
    };
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Son aktiviteleri getir' })
  @ApiResponse({ status: 200, description: 'Son aktiviteler başarıyla getirildi' })
  async getRecentActivities() {
    const activities = await this.analyticsService.getRecentActivities();

    return {
      success: true,
      message: 'Son aktiviteler başarıyla getirildi',
      data: activities
    };
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: 'Aylık gelir trendini getir' })
  @ApiResponse({ status: 200, description: 'Gelir trendi başarıyla getirildi' })
  async getRevenueTrend() {
    const trend = await this.analyticsService.getMonthlyRevenueTrend();

    return {
      success: true,
      message: 'Gelir trendi başarıyla getirildi',
      data: trend
    };
  }

  @Get('user-growth-trend')
  @ApiOperation({ summary: 'Kullanıcı artış trendini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı artış trendi başarıyla getirildi' })
  async getUserGrowthTrend() {
    const trend = await this.analyticsService.getUserGrowthTrend();

    return {
      success: true,
      message: 'Kullanıcı artış trendi başarıyla getirildi',
      data: trend
    };
  }
}
