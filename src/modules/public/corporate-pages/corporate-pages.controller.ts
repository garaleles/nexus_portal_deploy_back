import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CorporatePagesService } from '../../platform-admin/corporate-pages/corporate-pages.service';
import { CorporatePageType } from '../../platform-admin/corporate-pages/entities/corporate-page.entity';
import { Public } from '../../../core/auth/decorators/Public';

@ApiTags('Kurumsal Sayfalar - Public')
@Controller('public/corporate-pages')
@Public()
export class PublicCorporatePagesController {
  constructor(private readonly corporatePagesService: CorporatePagesService) { }

  @Get()
  @ApiOperation({ summary: 'Aktif kurumsal sayfaları listele' })
  @ApiResponse({ status: 200, description: 'Aktif kurumsal sayfalar başarıyla listelendi.' })
  findAllActive() {
    return this.corporatePagesService.findActive();
  }

  @Get(':type')
  @ApiOperation({ summary: 'Tip ile kurumsal sayfa getir' })
  @ApiResponse({ status: 200, description: 'Kurumsal sayfa başarıyla getirildi.' })
  @ApiResponse({ status: 404, description: 'Sayfa bulunamadı.' })
  async findByType(@Param('type') type: string) {
    // URL parameteresini enum değerine çevir
    const pageType = type as CorporatePageType;

    // Geçerli bir type olup olmadığını kontrol et
    if (!Object.values(CorporatePageType).includes(pageType)) {
      throw new NotFoundException('Sayfa bulunamadı');
    }

    return this.corporatePagesService.findByType(pageType);
  }
} 