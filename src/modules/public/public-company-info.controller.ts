import { Controller, Get } from '@nestjs/common';
import { CompanyInfoService } from '../platform-admin/company-info/company-info.service';
import { Public } from '../../core/auth/decorators/public.decorator';

@Controller('public/company-info')
export class PublicCompanyInfoController {
  constructor(
    private readonly companyInfoService: CompanyInfoService
  ) { }

  /**
   * Public company info - banka bilgileri vs. için
   */
  @Public()
  @Get()
  async getCompanyInfo() {
    try {
      const companyInfo = await this.companyInfoService.findFirst();

      if (!companyInfo) {
        return {
          success: false,
          message: 'Şirket bilgileri bulunamadı'
        };
      }

      // Sadece public bilgileri dön
      return {
        success: true,
        message: 'Şirket bilgileri başarıyla getirildi',
        data: {
          name: companyInfo.name,
          address: companyInfo.address,
          phone: companyInfo.phone,
          email: companyInfo.email,
          taxOffice: companyInfo.taxOffice,
          taxNumber: companyInfo.taxNumber,

          // Banka bilgileri
          bank1Name: companyInfo.bank1Name,
          bank1AccountHolder: companyInfo.bank1AccountHolder,
          bank1AccountNumber: companyInfo.bank1AccountNumber,
          bank1IBAN: companyInfo.bank1IBAN,
          bank2Name: companyInfo.bank2Name,
          bank2AccountHolder: companyInfo.bank2AccountHolder,
          bank2AccountNumber: companyInfo.bank2AccountNumber,
          bank2IBAN: companyInfo.bank2IBAN,

          // Logo bilgileri
          logoUrl: companyInfo.logoUrl,
          invoiceLogoUrl: companyInfo.invoiceLogoUrl,

          // Sosyal medya linkleri
          whatsapp: companyInfo.whatsapp,
          facebook: companyInfo.facebook,
          twitter: companyInfo.twitter,
          instagram: companyInfo.instagram,
          youtube: companyInfo.youtube,
          linkedin: companyInfo.linkedin,

          // İçerik bilgileri
          footerText: companyInfo.footerText,
          about: companyInfo.about,
          mission: companyInfo.mission,
          vision: companyInfo.vision,

          // Konum bilgileri
          googleMapsApiKey: companyInfo.googleMapsApiKey,
          locationLat: companyInfo.locationLat,
          locationLng: companyInfo.locationLng
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Şirket bilgileri alınırken hata oluştu',
        error: error.message
      };
    }
  }
} 