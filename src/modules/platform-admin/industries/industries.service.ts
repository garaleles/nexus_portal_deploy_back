import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from './entities/industry.entity';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';

@Injectable()
export class IndustriesService {
  constructor(
    @InjectRepository(Industry)
    private industryRepository: Repository<Industry>,
  ) {}

  /**
   * Tüm sektörleri getirir
   */
  async findAll(): Promise<Industry[]> {
    return this.industryRepository.find({
      order: {
        name: 'ASC', // Alfabetik sıralama
      },
    });
  }

  /**
   * Aktif sektörleri getirir
   */
  async findActive(): Promise<Industry[]> {
    return this.industryRepository.find({
      where: { isActive: true },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * ID'ye göre sektör getirir
   */
  async findOne(id: string): Promise<Industry> {
    const industry = await this.industryRepository.findOne({
      where: { id },
    });
    
    if (!industry) {
      throw new NotFoundException(`${id} ID'li sektör bulunamadı`);
    }
    
    return industry;
  }

  /**
   * Yeni sektör oluşturur
   */
  async create(createIndustryDto: CreateIndustryDto): Promise<Industry> {
    const industry = this.industryRepository.create(createIndustryDto);
    return this.industryRepository.save(industry);
  }

  /**
   * Sektörü günceller
   */
  async update(id: string, updateIndustryDto: UpdateIndustryDto): Promise<Industry> {
    const industry = await this.findOne(id);
    const updatedIndustry = Object.assign(industry, updateIndustryDto);
    return this.industryRepository.save(updatedIndustry);
  }

  /**
   * Sektörü siler
   */
  async remove(id: string): Promise<void> {
    const industry = await this.findOne(id);
    await this.industryRepository.remove(industry);
  }
}
