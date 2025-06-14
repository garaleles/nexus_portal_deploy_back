import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyInfo } from './entities/company-info.entity';
import { CreateCompanyInfoDto } from './dto/create-company-info.dto';
import { UpdateCompanyInfoDto } from './dto/update-company-info.dto';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

@Injectable()
export class CompanyInfoService {
  private readonly encryptedFields = ['googleMapsApiKey']; // Şifrelenecek alanlar

  constructor(
    @InjectRepository(CompanyInfo)
    private companyInfoRepository: Repository<CompanyInfo>,
    private encryptionService: EncryptionService,
    private cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Şirket bilgilerini getirir (genellikle tek kayıt olacak)
   */
  async findAll(): Promise<CompanyInfo[]> {
    return this.companyInfoRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Public endpoint için tenant kontrolü olmadan ilk şirket bilgisini getirir
   */
  async findFirstPublic(): Promise<CompanyInfo | null> {
    console.log('🔍 FIND_FIRST_PUBLIC - Veritabanından veri çekiliyor...');

    const companyInfos = await this.companyInfoRepository
      .createQueryBuilder('companyInfo')
      .orderBy('companyInfo.createdAt', 'ASC')
      .take(1)
      .getMany();

    if (companyInfos.length > 0) {
      const companyInfo = companyInfos[0];

      // Şifreli alanları çöz
      try {
        return this.encryptionService.decryptFields(companyInfo, this.encryptedFields);
      } catch (error) {
        console.warn('❌ FIND_FIRST_PUBLIC - Şifre çözme hatası, plain text olarak döndürülüyor:', error.message);
        return companyInfo;
      }
    }

    return null;
  }

  /**
   * İlk şirket bilgisini getirir (tenant kontrolü ile)
   */
  async findFirst(): Promise<CompanyInfo | null> {
    console.log('🔍 FIND_FIRST - Veritabanından veri çekiliyor...');

    const companyInfos = await this.companyInfoRepository.find({
      order: {
        createdAt: 'ASC',
      },
      take: 1,
    });

    console.log('🔍 FIND_FIRST - Bulunan kayıt sayısı:', companyInfos.length);

    if (companyInfos.length > 0) {
      const companyInfo = companyInfos[0];
      console.log('🔍 FIND_FIRST - Veritabanından gelen raw data:', {
        id: companyInfo.id,
        googleMapsApiKey: companyInfo.googleMapsApiKey,
      });

      // Eğer googleMapsApiKey varsa ve şifreli değilse (plain text), şifreli alanları çözmeye çalışma
      if (companyInfo.googleMapsApiKey && !this.isEncrypted(companyInfo.googleMapsApiKey)) {
        console.log('📄 FIND_FIRST - Plain text veri tespit edildi, olduğu gibi döndürülüyor');
        return companyInfo;
      }

      if (companyInfo.googleMapsApiKey) {
        console.log('🔓 FIND_FIRST - Şifreli veri tespit edildi, çözülmeye çalışılıyor');
      } else {
        console.log('⚠️  FIND_FIRST - googleMapsApiKey boş/null');
      }

      // Şifreli alanları çöz
      try {
        const decryptedData = this.encryptionService.decryptFields(companyInfo, this.encryptedFields);
        console.log('🔓 FIND_FIRST - Çözülmüş data:', {
          id: decryptedData.id,
          googleMapsApiKey: decryptedData.googleMapsApiKey,
        });
        return decryptedData;
      } catch (error) {
        console.warn('❌ FIND_FIRST - Şifre çözme hatası, plain text olarak döndürülüyor:', error.message);
        return companyInfo;
      }
    }

    console.log('🔍 FIND_FIRST - Hiç kayıt bulunamadı, null döndürülüyor');
    return null;
  }

  /**
   * ID'ye göre şirket bilgisini getirir
   */
  async findOne(id: string): Promise<CompanyInfo> {
    const companyInfo = await this.companyInfoRepository.findOne({
      where: { id },
    });

    if (!companyInfo) {
      throw new NotFoundException(`${id} ID'li şirket bilgisi bulunamadı`);
    }

    return companyInfo;
  }

  /**
 * Yeni şirket bilgisi oluşturur
 */
  async create(createCompanyInfoDto: CreateCompanyInfoDto): Promise<CompanyInfo> {
    console.log('🔐 CREATE - Gelen data:', createCompanyInfoDto);
    console.log('🔐 CREATE - Şifrelenecek alanlar:', this.encryptedFields);

    // Şifreli alanları şifrele
    const encryptedData = this.encryptionService.encryptFields(createCompanyInfoDto, this.encryptedFields);
    console.log('🔐 CREATE - Şifrelenmiş data:', encryptedData);

    const companyInfo = this.companyInfoRepository.create({
      ...encryptedData,
      logoUrl: createCompanyInfoDto.logoUrl || '/assets/images/noImage.png',
      invoiceLogoUrl: createCompanyInfoDto.invoiceLogoUrl || '/assets/images/noImage.png',
    });

    const savedCompanyInfo = await this.companyInfoRepository.save(companyInfo) as unknown as CompanyInfo;
    console.log('💾 CREATE - Kaydedilen data:', savedCompanyInfo);

    // Response'da şifreli alanları çöz (önce şifreli olup olmadığını kontrol et)
    if (savedCompanyInfo.googleMapsApiKey && this.isEncrypted(savedCompanyInfo.googleMapsApiKey)) {
      console.log('🔓 CREATE - Şifreli veri tespit edildi, çözülüyor...');
      const decryptedResponse = this.encryptionService.decryptFields(savedCompanyInfo, this.encryptedFields);
      console.log('🔓 CREATE - Döndürülen data:', decryptedResponse);
      return decryptedResponse;
    } else {
      console.log('📄 CREATE - Plain text veri, olduğu gibi döndürülüyor');
      return savedCompanyInfo;
    }
  }

  /**
   * Şirket bilgisini günceller
   */
  async update(id: string, updateCompanyInfoDto: UpdateCompanyInfoDto): Promise<CompanyInfo> {
    const companyInfo = await this.findOne(id);
    const updatedCompanyInfo = Object.assign(companyInfo, updateCompanyInfoDto);
    return this.companyInfoRepository.save(updatedCompanyInfo);
  }

  /**
   * Şirket bilgisini siler
   */
  async remove(id: string): Promise<void> {
    const companyInfo = await this.findOne(id);
    await this.companyInfoRepository.remove(companyInfo);
  }

  /**
   * Şirket bilgilerini oluşturur veya günceller (Upsert işlemi)
   * Eğer hiç kayıt yoksa yeni kayıt oluşturur, varsa ilk kaydı günceller
   */
  async createOrUpdate(companyInfoData: CreateCompanyInfoDto | UpdateCompanyInfoDto): Promise<CompanyInfo> {
    console.log('🔐 UPSERT - Gelen data:', companyInfoData);
    console.log('🔐 UPSERT - Şifrelenecek alanlar:', this.encryptedFields);

    const existingCompanyInfo = await this.findFirst();

    if (existingCompanyInfo) {
      console.log('📝 UPSERT - Mevcut kayıt bulundu, güncelleniyor...');

      // Şifreli alanları şifrele
      const encryptedData = this.encryptionService.encryptFields(companyInfoData, this.encryptedFields);
      console.log('🔐 UPSERT - Şifrelenmiş data:', encryptedData);

      // Mevcut kayıt varsa güncelle
      const updatedData = {
        ...encryptedData,
        logoUrl: companyInfoData.logoUrl || existingCompanyInfo.logoUrl,
        invoiceLogoUrl: companyInfoData.invoiceLogoUrl || existingCompanyInfo.invoiceLogoUrl,
      };

      const updatedCompanyInfo = Object.assign(existingCompanyInfo, updatedData);
      const savedInfo = await this.companyInfoRepository.save(updatedCompanyInfo) as unknown as CompanyInfo;
      console.log('💾 UPSERT - Güncellenen data:', savedInfo);

      // Response'da şifreli alanları çöz (önce şifreli olup olmadığını kontrol et)
      if (savedInfo.googleMapsApiKey && this.isEncrypted(savedInfo.googleMapsApiKey)) {
        console.log('🔓 UPSERT - Şifreli veri tespit edildi, çözülüyor...');
        const decryptedResponse = this.encryptionService.decryptFields(savedInfo, this.encryptedFields);
        console.log('🔓 UPSERT - Döndürülen data:', decryptedResponse);
        return decryptedResponse;
      } else {
        console.log('📄 UPSERT - Plain text veri, olduğu gibi döndürülüyor');
        return savedInfo;
      }
    } else {
      console.log('🆕 UPSERT - Yeni kayıt oluşturuluyor...');

      // Şifreli alanları şifrele
      const encryptedData = this.encryptionService.encryptFields(companyInfoData, this.encryptedFields);
      console.log('🔐 UPSERT - Şifrelenmiş data:', encryptedData);

      // Mevcut kayıt yoksa yeni kayıt oluştur
      const newCompanyInfo = this.companyInfoRepository.create({
        ...encryptedData,
        logoUrl: companyInfoData.logoUrl || '/assets/images/noImage.png',
        invoiceLogoUrl: companyInfoData.invoiceLogoUrl || '/assets/images/noImage.png',
      });

      const savedInfo = await this.companyInfoRepository.save(newCompanyInfo) as unknown as CompanyInfo;
      console.log('💾 UPSERT - Kaydedilen data:', savedInfo);

      // Response'da şifreli alanları çöz (önce şifreli olup olmadığını kontrol et)
      if (savedInfo.googleMapsApiKey && this.isEncrypted(savedInfo.googleMapsApiKey)) {
        console.log('🔓 UPSERT - Şifreli veri tespit edildi, çözülüyor...');
        const decryptedResponse = this.encryptionService.decryptFields(savedInfo, this.encryptedFields);
        console.log('🔓 UPSERT - Döndürülen data:', decryptedResponse);
        return decryptedResponse;
      } else {
        console.log('📄 UPSERT - Plain text veri, olduğu gibi döndürülüyor');
        return savedInfo;
      }
    }
  }

  /**
 * Logo dosyası yükler ve şirket bilgilerini günceller
 */
  async uploadLogo(file: Express.Multer.File, logoType: 'main' | 'invoice'): Promise<{ url: string; publicId: string }> {
    // Dosya validasyonu (mevcut products service'indeki gibi)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Geçersiz dosya formatı. Sadece JPEG, PNG ve WebP dosyaları kabul edilir.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Dosya boyutu çok büyük. Maksimum 5MB yükleme yapabilirsiniz.');
    }

    // Cloudinary'ye yükle (mevcut service kullanarak)
    const uploadResult = await this.cloudinaryService.uploadFile(file, `company-logos/${logoType}`);

    // Mevcut şirket bilgilerini bul
    const existingCompanyInfo = await this.findFirst();

    if (existingCompanyInfo) {
      // Eski logo varsa sil
      const oldPublicId = logoType === 'main' ? existingCompanyInfo.logoPublicId : existingCompanyInfo.invoiceLogoPublicId;
      if (oldPublicId) {
        await this.cloudinaryService.deleteFile(oldPublicId);
      }

      // Yeni logo bilgilerini güncelle
      const updateData = logoType === 'main'
        ? { logoUrl: uploadResult.secure_url, logoPublicId: uploadResult.public_id }
        : { invoiceLogoUrl: uploadResult.secure_url, invoiceLogoPublicId: uploadResult.public_id };

      await this.update(existingCompanyInfo.id, updateData);
    }

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  }

  /**
   * Verinin şifreli olup olmadığını kontrol eder
   * Şifreli veri hex formatında olmalı
   */
  private isEncrypted(data: string): boolean {
    // Hex string kontrolü (sadece 0-9, a-f, A-F karakterleri)
    const hexRegex = /^[a-fA-F0-9]+$/;

    // En az 32 karakter olmalı ve hex formatında olmalı
    return data.length >= 32 && hexRegex.test(data);
  }
} 