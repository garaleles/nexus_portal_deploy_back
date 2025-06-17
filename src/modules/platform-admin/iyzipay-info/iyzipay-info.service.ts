import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IyzipayInfo } from './entities/iyzipay-info.entity';
import { CreateIyzipayInfoDto } from './dto/create-iyzipay-info.dto';
import { UpdateIyzipayInfoDto } from './dto/update-iyzipay-info.dto';
import { PaymentRequestDto, InstallmentInfoRequestDto } from './dto/iyzipay-payment.dto';
import { EncryptionService } from '../../../shared/services/encryption.service';
import * as Iyzipay from 'iyzipay';

@Injectable()
export class IyzipayInfoService {
  private readonly encryptedFields = ['apiKey', 'secretKey']; // Şifrelenecek hassas alanlar

  constructor(
    @InjectRepository(IyzipayInfo)
    private iyzipayInfoRepository: Repository<IyzipayInfo>,
    private encryptionService: EncryptionService,
  ) { }

  async create(createIyzipayInfoDto: CreateIyzipayInfoDto): Promise<IyzipayInfo> {
    try {
      console.log('🔐 CREATE - Gelen data:', createIyzipayInfoDto);
      console.log('🔐 CREATE - Şifrelenecek alanlar:', this.encryptedFields);

      // Sadece bir tane aktif iyzipay config olabilir
      if (createIyzipayInfoDto.isActive) {
        await this.iyzipayInfoRepository
          .createQueryBuilder()
          .update(IyzipayInfo)
          .set({ isActive: false })
          .execute();
      }

      // Hassas alanları şifrele
      const encryptedData = this.encryptionService.encryptFields(createIyzipayInfoDto, this.encryptedFields);
      console.log('🔐 CREATE - Şifrelenmiş data:', encryptedData);

      const iyzipayInfo = this.iyzipayInfoRepository.create(encryptedData);
      const savedIyzipayInfo = await this.iyzipayInfoRepository.save(iyzipayInfo);
      console.log('💾 CREATE - Kaydedilen data:', savedIyzipayInfo);

      // Saved entity'yi tek bir obje olarak al (TypeORM array döndürebilir)
      const entityToReturn = Array.isArray(savedIyzipayInfo) ? savedIyzipayInfo[0] : savedIyzipayInfo;

      // Response'da şifreli alanları çöz
      if (this.hasEncryptedFields(entityToReturn)) {
        console.log('🔓 CREATE - Şifreli veri tespit edildi, çözülüyor...');
        const decryptedResponse = this.encryptionService.decryptFields(entityToReturn, this.encryptedFields) as IyzipayInfo;
        console.log('🔓 CREATE - Döndürülen data:', decryptedResponse);
        return decryptedResponse;
      } else {
        console.log('📄 CREATE - Plain text veri, olduğu gibi döndürülüyor');
        return entityToReturn as IyzipayInfo;
      }
    } catch (error) {
      console.error('❌ CREATE - Hata:', error);
      throw new BadRequestException('İyzipay bilgileri oluşturulurken bir hata oluştu');
    }
  }

  async findAll(): Promise<IyzipayInfo[]> {
    try {
      console.log('🔍 FIND_ALL - Veritabanından veri çekiliyor...');

      const iyzipayInfos = await this.iyzipayInfoRepository.find();
      console.log('🔍 FIND_ALL - Bulunan kayıt sayısı:', iyzipayInfos.length);

      if (iyzipayInfos.length === 0) {
        console.log('📄 FIND_ALL - Hiç kayıt yok, boş array döndürülüyor');
        return [];
      }

      // Her kayıt için şifreli alanları çöz
      const decryptedInfos: IyzipayInfo[] = iyzipayInfos.map(info => {
        try {
          if (this.hasEncryptedFields(info)) {
            console.log('🔓 FIND_ALL - Şifreli veri tespit edildi, çözülüyor...', info.id);
            return this.encryptionService.decryptFields(info, this.encryptedFields) as IyzipayInfo;
          } else {
            console.log('📄 FIND_ALL - Plain text veri, olduğu gibi döndürülüyor', info.id);
            return info;
          }
        } catch (decryptError) {
          console.error('❌ FIND_ALL - Decrypt hatası:', decryptError);
          // Decrypt hatası varsa plain text olarak döndür
          return info;
        }
      });

      return decryptedInfos;
    } catch (error) {
      console.error('❌ FIND_ALL - Hata:', error);
      throw new BadRequestException('İyzipay bilgileri getirilirken bir hata oluştu: ' + error.message);
    }
  }

  async findOne(id: string): Promise<IyzipayInfo> {
    console.log('🔍 FIND_ONE - ID ile veri çekiliyor:', id);

    const iyzipayInfo = await this.iyzipayInfoRepository.findOne({ where: { id } });
    if (!iyzipayInfo) {
      throw new NotFoundException('İyzipay bilgileri bulunamadı');
    }

    // Şifreli alanları çöz
    if (this.hasEncryptedFields(iyzipayInfo)) {
      console.log('🔓 FIND_ONE - Şifreli veri tespit edildi, çözülüyor...');
      const decryptedInfo = this.encryptionService.decryptFields(iyzipayInfo, this.encryptedFields) as IyzipayInfo;
      console.log('🔓 FIND_ONE - Döndürülen data:', decryptedInfo);
      return decryptedInfo;
    } else {
      console.log('📄 FIND_ONE - Plain text veri, olduğu gibi döndürülüyor');
      return iyzipayInfo;
    }
  }

  async findActive(): Promise<IyzipayInfo> {
    console.log('🔍 FIND_ACTIVE - Aktif konfigürasyon çekiliyor...');

    const iyzipayInfo = await this.iyzipayInfoRepository.findOne({ where: { isActive: true } });
    if (!iyzipayInfo) {
      throw new NotFoundException('Aktif İyzipay konfigürasyonu bulunamadı');
    }

    // Şifreli alanları çöz
    if (this.hasEncryptedFields(iyzipayInfo)) {
      console.log('🔓 FIND_ACTIVE - Şifreli veri tespit edildi, çözülüyor...');
      const decryptedInfo = this.encryptionService.decryptFields(iyzipayInfo, this.encryptedFields) as IyzipayInfo;
      console.log('🔓 FIND_ACTIVE - Döndürülen data:', decryptedInfo);
      return decryptedInfo;
    } else {
      console.log('📄 FIND_ACTIVE - Plain text veri, olduğu gibi döndürülüyor');
      return iyzipayInfo;
    }
  }

  async update(id: string, updateIyzipayInfoDto: UpdateIyzipayInfoDto): Promise<IyzipayInfo> {
    try {
      console.log('🔐 UPDATE - Gelen data:', updateIyzipayInfoDto);
      console.log('🔐 UPDATE - Şifrelenecek alanlar:', this.encryptedFields);

      // Eğer bu config aktif yapılıyorsa, diğerlerini pasif yap
      if (updateIyzipayInfoDto.isActive) {
        await this.iyzipayInfoRepository
          .createQueryBuilder()
          .update(IyzipayInfo)
          .set({ isActive: false })
          .where('id != :id', { id })
          .execute();
      }

      // Hassas alanları şifrele (sadece gelen alanları)
      const encryptedData = this.encryptionService.encryptFields(updateIyzipayInfoDto, this.encryptedFields);
      console.log('🔐 UPDATE - Şifrelenmiş data:', encryptedData);

      await this.iyzipayInfoRepository.update(id, encryptedData);
      const updatedIyzipayInfo = await this.findOne(id);

      console.log('💾 UPDATE - Güncellenen data:', updatedIyzipayInfo);
      return updatedIyzipayInfo;
    } catch (error) {
      console.error('❌ UPDATE - Hata:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('İyzipay bilgileri güncellenirken bir hata oluştu');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.iyzipayInfoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('İyzipay bilgileri bulunamadı');
    }
  }

  async setActive(id: string): Promise<IyzipayInfo> {
    console.log('🔄 SET_ACTIVE - ID için aktif yapılıyor:', id);

    // Önce tüm konfigürasyonları pasif yap
    await this.iyzipayInfoRepository
      .createQueryBuilder()
      .update(IyzipayInfo)
      .set({ isActive: false })
      .execute();

    // Seçili konfigürasyonu aktif yap
    await this.iyzipayInfoRepository.update(id, { isActive: true });

    return await this.findOne(id);
  }

  async getIyzipayClient(): Promise<any> {
    const config = await this.findActive();

    return new Iyzipay({
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      uri: config.baseUrl,
    });
  }

  async calculateInstallments(amount: number, binNumber: string): Promise<any> {
    const iyzipay = await this.getIyzipayClient();
    const config = await this.findActive();

    const request = {
      binNumber: binNumber,
      price: amount.toString(),
    };

    return new Promise((resolve, reject) => {
      iyzipay.installmentInfo.retrieve(request, (err: any, result: any) => {
        if (err) {
          reject(new BadRequestException('Taksit bilgileri alınırken hata oluştu'));
        } else {
          // Konfigürasyondaki taksit seçenekleriyle filtrele
          if (result.status === 'success' && config.installmentOptions && config.installmentOptions.length > 0) {
            result.installmentDetails = result.installmentDetails.map((detail: any) => {
              detail.installmentPrices = detail.installmentPrices.filter((installment: any) => {
                return config.installmentOptions.some((option) => {
                  const installmentCount = parseInt(installment.installmentNumber);
                  return installmentCount === option.count &&
                    amount >= option.minAmount &&
                    amount <= option.maxAmount;
                });
              });
              return detail;
            });
          }
          resolve(result);
        }
      });
    });
  }

  async processPayment(paymentRequest: PaymentRequestDto): Promise<any> {
    console.log('💳 PROCESS_PAYMENT - Başlıyor...');
    console.log('💳 PROCESS_PAYMENT - Gelen payment request:', JSON.stringify(paymentRequest, null, 2));
    console.log('💳 PROCESS_PAYMENT - Buyer bilgileri:', JSON.stringify(paymentRequest.buyer, null, 2));

    // İyzico SDK'sı identityNumber bekliyor, yoksa dummy değer ata
    if (!paymentRequest.buyer.identityNumber) {
      paymentRequest.buyer.identityNumber = '11111111111'; // Dummy TC kimlik numarası
      console.log('💳 PROCESS_PAYMENT - identityNumber boş, dummy değer atandı:', paymentRequest.buyer.identityNumber);
    }

    const iyzipay = await this.getIyzipayClient();

    return new Promise((resolve, reject) => {
      iyzipay.payment.create(paymentRequest, (err: any, result: any) => {
        if (err) {
          console.error('❌ PROCESS_PAYMENT - İyzico SDK Hatası:', err);
          console.error('❌ PROCESS_PAYMENT - Hata detayları:', JSON.stringify(err, null, 2));

          // İyzico'dan gelen hata mesajını daha detaylı şekilde frontend'e aktar
          const errorMessage = err.message || err.errorMessage || 'Ödeme işlemi sırasında hata oluştu';
          const errorCode = err.errorCode || 'PAYMENT_ERROR';

          reject(new BadRequestException({
            message: errorMessage,
            errorCode: errorCode,
            details: err
          }));
        } else {
          console.log('✅ PROCESS_PAYMENT - İyzico SDK Başarılı:', JSON.stringify(result, null, 2));
          resolve(result);
        }
      });
    });
  }

  async getAvailableInstallments(amount: number): Promise<any[]> {
    const config = await this.findActive();

    if (!config.installmentOptions) return [];

    return config.installmentOptions.filter(option =>
      amount >= option.minAmount && amount <= option.maxAmount
    );
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const iyzipay = await this.getIyzipayClient();

      // Basit bir test isteği gönder
      const testRequest = {
        binNumber: '554960',
        price: '100.0',
      };

      return new Promise((resolve) => {
        iyzipay.installmentInfo.retrieve(testRequest, (err: any, result: any) => {
          if (err) {
            resolve({
              success: false,
              message: 'İyzipay bağlantısı başarısız: ' + (err.message || 'Bilinmeyen hata')
            });
          } else {
            resolve({
              success: true,
              message: 'İyzipay bağlantısı başarılı'
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        message: 'İyzipay konfigürasyonu hatası: ' + error.message
      };
    }
  }

  async initializeThreedsPayment(threedsRequest: any): Promise<any> {
    console.log('🔒 THREEDS_INITIALIZE - 3DS başlatılıyor...');
    console.log('🔒 THREEDS_INITIALIZE - Gelen request:', JSON.stringify(threedsRequest, null, 2));

    // İyzico SDK'sı identityNumber bekliyor, yoksa dummy değer ata
    if (!threedsRequest.buyer.identityNumber) {
      threedsRequest.buyer.identityNumber = '11111111111';
      console.log('🔒 THREEDS_INITIALIZE - identityNumber boş, dummy değer atandı');
    }

    const iyzipay = await this.getIyzipayClient();

    return new Promise((resolve, reject) => {
      iyzipay.threedsInitialize.create(threedsRequest, (err: any, result: any) => {
        if (err) {
          console.error('❌ THREEDS_INITIALIZE - İyzico SDK Hatası:', err);
          reject(new BadRequestException({
            message: err.message || err.errorMessage || '3DS başlatma hatası',
            errorCode: err.errorCode || 'THREEDS_INIT_ERROR',
            details: err
          }));
        } else {
          console.log('✅ THREEDS_INITIALIZE - İyzico SDK Başarılı:', JSON.stringify(result, null, 2));
          resolve(result);
        }
      });
    });
  }

  async completeThreedsPayment(completeRequest: any): Promise<any> {
    console.log('🔒 THREEDS_COMPLETE - 3DS tamamlanıyor...');
    console.log('🔒 THREEDS_COMPLETE - Gelen request:', JSON.stringify(completeRequest, null, 2));

    const iyzipay = await this.getIyzipayClient();

    return new Promise((resolve, reject) => {
      iyzipay.threedsPayment.create(completeRequest, (err: any, result: any) => {
        if (err) {
          console.error('❌ THREEDS_COMPLETE - İyzico SDK Hatası:', err);
          reject(new BadRequestException({
            message: err.message || err.errorMessage || '3DS tamamlama hatası',
            errorCode: err.errorCode || 'THREEDS_COMPLETE_ERROR',
            details: err
          }));
        } else {
          console.log('✅ THREEDS_COMPLETE - İyzico SDK Başarılı:', JSON.stringify(result, null, 2));
          resolve(result);
        }
      });
    });
  }

  /**
   * Verinin şifreli alanları olup olmadığını kontrol eder
   */
  private hasEncryptedFields(data: any): boolean {
    return this.encryptedFields.some(field => {
      const value = data[field];
      return value && this.isEncrypted(value);
    });
  }

  /**
   * Verinin şifreli olup olmadığını kontrol eder
   * Şifreli veri hex formatında olmalı
   */
  private isEncrypted(data: string): boolean {
    if (!data) return false;

    // Hex string kontrolü (sadece 0-9, a-f, A-F karakterleri)
    const hexRegex = /^[a-fA-F0-9]+$/;

    // En az 32 karakter olmalı ve hex formatında olmalı
    return data.length >= 32 && hexRegex.test(data);
  }
} 