import { Controller, Get, Post, Body, Param, Put, Delete, Query, ParseBoolPipe, UseGuards } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';

@Controller('platform-admin/subscription-plans')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlansService: SubscriptionPlansService) { }

  @Get()
  async findAll(@Query('active') active?: string): Promise<SubscriptionPlan[]> {
    const onlyActive = active === 'true';
    return this.subscriptionPlansService.findAll(onlyActive);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlansService.findOne(id);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlansService.findByCode(code);
  }

  @Post()
  async create(@Body() createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionPlansService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionPlansService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.subscriptionPlansService.remove(id);
  }

  @Put(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlansService.toggleStatus(id);
  }
}
