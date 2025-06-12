import { Controller, Get } from '@nestjs/common';
import { IndustriesService } from '../platform-admin/industries/industries.service';
import { Industry } from '../platform-admin/industries/entities/industry.entity';

@Controller('public/industries')
export class PublicIndustriesController {
  constructor(private readonly industriesService: IndustriesService) { }

  /**
   * Aktif sektörleri getirir (public endpoint)
   */
  @Get('active')
  async getActiveIndustries(): Promise<Industry[]> {
    return this.industriesService.findActive();
  }

  /**
   * Tüm sektörleri getirir (public endpoint)
   */
  @Get()
  async getAllIndustries(): Promise<Industry[]> {
    return this.industriesService.findAll();
  }
} 