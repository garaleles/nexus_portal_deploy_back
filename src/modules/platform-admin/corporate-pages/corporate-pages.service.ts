import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorporatePage, CorporatePageType } from './entities/corporate-page.entity';
import { CreateCorporatePageDto } from './dto/create-corporate-page.dto';
import { UpdateCorporatePageDto } from './dto/update-corporate-page.dto';

@Injectable()
export class CorporatePagesService {
  constructor(
    @InjectRepository(CorporatePage)
    private corporatePageRepository: Repository<CorporatePage>,
  ) { }

  async create(createCorporatePageDto: CreateCorporatePageDto): Promise<CorporatePage> {
    const corporatePage = this.corporatePageRepository.create(createCorporatePageDto);
    return await this.corporatePageRepository.save(corporatePage);
  }

  async findAll(): Promise<CorporatePage[]> {
    return await this.corporatePageRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<CorporatePage[]> {
    return await this.corporatePageRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CorporatePage> {
    const corporatePage = await this.corporatePageRepository.findOne({
      where: { id }
    });

    if (!corporatePage) {
      throw new NotFoundException('Kurumsal sayfa bulunamadı');
    }

    return corporatePage;
  }

  async findByType(type: CorporatePageType): Promise<CorporatePage> {
    const corporatePage = await this.corporatePageRepository.findOne({
      where: { type, isActive: true }
    });

    if (!corporatePage) {
      throw new NotFoundException('Kurumsal sayfa bulunamadı');
    }

    return corporatePage;
  }

  async update(id: string, updateCorporatePageDto: UpdateCorporatePageDto): Promise<CorporatePage> {
    const corporatePage = await this.findOne(id);
    Object.assign(corporatePage, updateCorporatePageDto);
    return await this.corporatePageRepository.save(corporatePage);
  }

  async remove(id: string): Promise<void> {
    const corporatePage = await this.findOne(id);
    await this.corporatePageRepository.remove(corporatePage);
  }

  async initializeDefaultPages(): Promise<void> {
    const defaultPages = [
      {
        type: CorporatePageType.PRIVACY_POLICY,
        title: 'Gizlilik Politikası',
        content: '<h2>Gizlilik Politikası</h2><p>Bu gizlilik politikası, kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi vermektedir.</p>',
        metaTitle: 'Gizlilik Politikası',
        metaDescription: 'Kişisel verilerinizin korunması hakkındaki politikamız',
      },
      {
        type: CorporatePageType.TERMS_OF_SERVICE,
        title: 'Kullanım Şartları',
        content: '<h2>Kullanım Şartları</h2><p>Bu kullanım şartları, hizmetlerimizi kullanırken uymanız gereken kuralları içermektedir.</p>',
        metaTitle: 'Kullanım Şartları',
        metaDescription: 'Hizmetlerimizi kullanım şartları ve koşulları',
      },
      {
        type: CorporatePageType.COOKIE_POLICY,
        title: 'Çerez Politikası',
        content: '<h2>Çerez Politikası</h2><p>Bu çerez politikası, web sitemizde kullanılan çerezler hakkında bilgi vermektedir.</p>',
        metaTitle: 'Çerez Politikası',
        metaDescription: 'Web sitemizde kullanılan çerezler hakkında bilgi',
      },
      {
        type: CorporatePageType.KVKK,
        title: 'KVKK Aydınlatma Metni',
        content: '<h2>KVKK Aydınlatma Metni</h2><p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.</p>',
        metaTitle: 'KVKK Aydınlatma Metni',
        metaDescription: 'Kişisel Verilerin Korunması Kanunu aydınlatma metni',
      },
    ];

    for (const pageData of defaultPages) {
      const existingPage = await this.corporatePageRepository.findOne({
        where: { type: pageData.type },
      });

      if (!existingPage) {
        const corporatePage = this.corporatePageRepository.create(pageData);
        await this.corporatePageRepository.save(corporatePage);
      }
    }
  }
} 