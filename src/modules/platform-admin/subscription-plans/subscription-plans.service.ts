import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepository: Repository<SubscriptionPlan>,
  ) {}

  /**
   * Tüm abonelik planlarını getirir
   */
  async findAll(onlyActive: boolean = false): Promise<SubscriptionPlan[]> {
    if (onlyActive) {
      return this.subscriptionPlanRepository.find({
        where: { isActive: true },
        order: { price: 'ASC' },
      });
    }
    return this.subscriptionPlanRepository.find({
      order: { price: 'ASC' },
    });
  }

  /**
   * ID'ye göre abonelik planını getirir
   */
  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`ID: ${id} olan abonelik planı bulunamadı`);
    }

    return plan;
  }

  /**
   * Koda göre abonelik planını getirir
   */
  async findByCode(code: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { code },
    });

    if (!plan) {
      throw new NotFoundException(`Kod: ${code} olan abonelik planı bulunamadı`);
    }

    return plan;
  }

  /**
   * Yeni abonelik planı oluşturur
   */
  async create(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const newPlan = this.subscriptionPlanRepository.create(createDto);
    return this.subscriptionPlanRepository.save(newPlan);
  }

  /**
   * Abonelik planını günceller
   */
  async update(id: string, updateDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);
    
    // Nesneyi güncelle
    Object.assign(plan, updateDto);
    
    return this.subscriptionPlanRepository.save(plan);
  }

  /**
   * Abonelik planını siler
   */
  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.subscriptionPlanRepository.remove(plan);
  }

  /**
   * Abonelik planının aktiflik durumunu değiştirir
   */
  async toggleStatus(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);
    plan.isActive = !plan.isActive;
    return this.subscriptionPlanRepository.save(plan);
  }
}
