import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { EmailConfig } from './entities/email-config.entity';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from './dto/email-config.dto';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Injectable()
export class EmailConfigsService {
  private readonly encryptedFields = ['password']; // Şifrelenecek alanlar

  constructor(
    @InjectRepository(EmailConfig)
    private readonly emailConfigRepository: Repository<EmailConfig>,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) { }

  /**
   * E-posta yapılandırmasını oluşturur
   * @param createEmailConfigDto E-posta yapılandırma bilgileri
   */
  async create(createEmailConfigDto: CreateEmailConfigDto): Promise<EmailConfig> {
    console.log('🔐 EMAIL_CONFIG CREATE - Gelen data:', createEmailConfigDto);

    // Aktif yapılandırma var mı kontrol et
    const existingConfig = await this.emailConfigRepository.findOne({
      where: { isActive: true },
    });

    if (existingConfig) {
      // Varsa devre dışı bırak
      existingConfig.isActive = false;
      await this.emailConfigRepository.save(existingConfig);
    }

    // Şifreli alanları şifrele
    const encryptedData = this.encryptionService.encryptFields(createEmailConfigDto, this.encryptedFields);
    console.log('🔐 EMAIL_CONFIG CREATE - Şifrelenmiş data:', encryptedData);

    // Yeni yapılandırma oluştur
    const emailConfig = this.emailConfigRepository.create({
      ...encryptedData,
      isActive: true,
    });

    try {
      const savedConfig = await this.emailConfigRepository.save(emailConfig) as unknown as EmailConfig;
      console.log('💾 EMAIL_CONFIG CREATE - Kaydedilen data:', savedConfig);
      return savedConfig;
    } catch (error) {
      console.error('❌ EMAIL_CONFIG CREATE - Hata:', error);
      throw new InternalServerErrorException('E-posta yapılandırması oluşturulurken bir hata oluştu');
    }
  }

  /**
   * Tüm e-posta yapılandırmalarını getirir (şifreler çözülmüş halde)
   */
  async findAll(): Promise<EmailConfig[]> {
    try {
      console.log('🔍 EMAIL_CONFIG_SERVICE - findAll başlatılıyor...');
      const configs = await this.emailConfigRepository.find();
      console.log('🔍 EMAIL_CONFIG_SERVICE - Bulunan config sayısı:', configs.length);

      // Şifreleri çöz
      const decryptedConfigs = configs.map(config => {
        console.log('🔓 DECRYPT ÖNCESI - Config:', { id: config.id, password: config.password?.substring(0, 20) + '...' });
        const decrypted = this.encryptionService.decryptFields(config, this.encryptedFields);
        console.log('🔓 DECRYPT SONRASI - Config:', { id: decrypted.id, password: decrypted.password?.substring(0, 20) + '...' });
        return decrypted;
      });

      console.log('🔓 EMAIL_CONFIG_SERVICE - Şifreler çözüldü, döndürülüyor...');
      console.log('📤 API_RESPONSE - Frontend\'e döndürülen data:', JSON.stringify(decryptedConfigs, null, 2));
      return decryptedConfigs;
    } catch (error) {
      console.error('❌ EMAIL_CONFIG_SERVICE - findAll hatası:', error);
      throw error;
    }
  }

  /**
   * Aktif e-posta yapılandırmasını getirir
   */
  async findActive(): Promise<EmailConfig> {
    const emailConfig = await this.emailConfigRepository.findOne({
      where: { isActive: true },
    });

    if (!emailConfig) {
      throw new NotFoundException('Aktif e-posta yapılandırması bulunamadı');
    }

    return emailConfig;
  }

  /**
   * Belirli bir e-posta yapılandırmasını getirir
   * @param id Yapılandırma ID'si
   */
  async findOne(id: string): Promise<EmailConfig> {
    const emailConfig = await this.emailConfigRepository.findOne({
      where: { id },
    });

    if (!emailConfig) {
      throw new NotFoundException(`${id} ID'li e-posta yapılandırması bulunamadı`);
    }

    return emailConfig;
  }

  /**
   * E-posta yapılandırmasını günceller
   * @param id Yapılandırma ID'si
   * @param updateEmailConfigDto Güncellenecek bilgiler
   */
  async update(id: string, updateEmailConfigDto: UpdateEmailConfigDto): Promise<EmailConfig> {
    console.log('🔐 EMAIL_CONFIG UPDATE - Gelen data:', updateEmailConfigDto);

    const emailConfig = await this.findOne(id);

    // Eğer password undefined/null/boş string ise mevcut şifreyi koru
    if (!updateEmailConfigDto.password || updateEmailConfigDto.password.trim() === '') {
      delete updateEmailConfigDto.password;
      console.log('🔒 EMAIL_CONFIG UPDATE - Password boş, mevcut şifre korunuyor');
    }

    // Şifreli alanları şifrele (sadece değişenler)
    const encryptedData = this.encryptionService.encryptFields(updateEmailConfigDto, this.encryptedFields);
    console.log('🔐 EMAIL_CONFIG UPDATE - Şifrelenmiş data:', encryptedData);

    // Yapılandırmayı güncelle
    Object.assign(emailConfig, encryptedData);

    try {
      const savedConfig = await this.emailConfigRepository.save(emailConfig) as unknown as EmailConfig;
      console.log('💾 EMAIL_CONFIG UPDATE - Güncellenen data:', savedConfig);
      return savedConfig;
    } catch (error) {
      console.error('❌ EMAIL_CONFIG UPDATE - Hata:', error);
      throw new InternalServerErrorException('E-posta yapılandırması güncellenirken bir hata oluştu');
    }
  }

  /**
   * Belirli bir yapılandırmayı aktifleştirir
   * @param id Yapılandırma ID'si
   */
  async setActive(id: string): Promise<EmailConfig> {
    // Tüm yapılandırmaları devre dışı bırak
    await this.emailConfigRepository.update({}, { isActive: false });

    // Belirtilen yapılandırmayı bul
    const emailConfig = await this.findOne(id);

    // Aktifleştir
    emailConfig.isActive = true;
    return this.emailConfigRepository.save(emailConfig) as unknown as Promise<EmailConfig>;
  }

  /**
   * E-posta yapılandırmasını siler
   * @param id Yapılandırma ID'si
   */
  async remove(id: string): Promise<void> {
    const emailConfig = await this.findOne(id);

    if (emailConfig.isActive) {
      throw new ConflictException('Aktif e-posta yapılandırması silinemez');
    }

    await this.emailConfigRepository.remove(emailConfig);
  }

  /**
   * Şifresi çözülmüş yapılandırmayı getirir
   */
  async getDecryptedConfig(): Promise<any> {
    console.log('🔓 EMAIL_CONFIG getDecryptedConfig - Başlatılıyor...');

    const config = await this.findActive();
    console.log('🔓 EMAIL_CONFIG getDecryptedConfig - Bulunan config:', config);

    const decryptedConfig = this.encryptionService.decryptFields(config, this.encryptedFields);
    console.log('🔓 EMAIL_CONFIG getDecryptedConfig - Çözülmüş config:', decryptedConfig);

    return decryptedConfig;
  }

  /**
   * Aktif e-posta yapılandırmasını şifreli alanları çözülmüş halde getirir
   */
  async findActiveDecrypted(): Promise<EmailConfig> {
    console.log('🔓 EMAIL_CONFIG findActiveDecrypted - Başlatılıyor...');

    const config = await this.findActive();
    console.log('🔓 EMAIL_CONFIG findActiveDecrypted - Bulunan config:', config);

    const decryptedConfig = this.encryptionService.decryptFields(config, this.encryptedFields);
    console.log('🔓 EMAIL_CONFIG findActiveDecrypted - Çözülmüş config:', decryptedConfig);

    return decryptedConfig;
  }

  /**
   * .env dosyasındaki ayarları kullanarak ilk yapılandırmayı oluşturur
   */
  async seedFromEnv(): Promise<EmailConfig> {
    const existingConfig = await this.emailConfigRepository.findOne({
      where: { isActive: true },
    });

    if (existingConfig) {
      return existingConfig;
    }

    const configData = {
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      user: this.configService.get<string>('MAIL_USER'),
      password: this.configService.get<string>('MAIL_PASSWORD'),
      fromName: this.configService.get<string>('MAIL_FROM_NAME'),
      fromAddress: this.configService.get<string>('MAIL_FROM_ADDRESS'),
      frontendUrl: this.configService.get<string>('FRONTEND_URL'),
    };

    return this.create(configData as CreateEmailConfigDto);
  }

  /**
   * Nodemailer transporter örneğini döndürür
   */
  private async createTransporter() {
    const config = await this.getDecryptedConfig();

    // Gmail SMTP için doğru konfigürasyon
    const transportConfig: any = {
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.password,
      },
    };

    // Port 587 için STARTTLS kullan, port 465 için SSL kullan
    if (config.port === 587) {
      transportConfig.secure = false;
      transportConfig.requireTLS = true;
    } else if (config.port === 465) {
      transportConfig.secure = true;
    } else {
      // Diğer portlar için config'deki ayarı kullan
      transportConfig.secure = config.secure;
    }

    return nodemailer.createTransport(transportConfig);
  }

  /**
   * Kullanıcıya e-posta doğrulama linki gönderir
   * @param user Kullanıcı bilgileri
   * @param token Doğrulama token'ı
   */
  async sendVerificationEmail(user: any, token: string): Promise<void> {
    try {
      const config = await this.getDecryptedConfig();
      const transporter = await this.createTransporter();

      // Frontend URL'yi doğrudan .env dosyasından al - veritabanındaki değeri kullanma
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error('FRONTEND_URL .env dosyasında tanımlanmamış! Doğrulama e-postası gönderilemedi.');
      }
      console.log('E-posta doğrulama link frontend URL:', frontendUrl);

      const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: user.email,
        subject: 'E-posta Adresinizi Doğrulayın',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Merhaba ${user.name || 'Değerli Kullanıcı'}!</h2>
            <p>Business Portal hesabınızı oluşturduğunuz için teşekkür ederiz.</p>
            <p>Hesabınızı aktifleştirmek için lütfen aşağıdaki butona tıklayın:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                E-posta Adresimi Doğrula
              </a>
            </div>
            <p>Veya aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:</p>
            <p>${verificationUrl}</p>
            <p>Bu e-postayı talep etmediyseniz, lütfen dikkate almayın.</p>
            <p>Saygılarımızla,<br>Business Portal Ekibi</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('E-posta gönderimi sırasında hata oluştu:', error);
      throw new InternalServerErrorException('E-posta gönderimi sırasında bir hata oluştu');
    }
  }

  /**
   * Şifre sıfırlama linki gönderir
   * @param user Kullanıcı bilgileri
   * @param token Şifre sıfırlama token'ı
   */
  async sendPasswordResetEmail(user: any, token: string): Promise<void> {
    try {
      const config = await this.getDecryptedConfig();
      const transporter = await this.createTransporter();

      // Frontend URL'yi doğrudan .env dosyasından al - veritabanındaki değeri kullanma
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error('FRONTEND_URL .env dosyasında tanımlanmamış! Şifre sıfırlama e-postası gönderilemedi.');
      }
      console.log('Şifre sıfırlama link frontend URL:', frontendUrl);

      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: user.email,
        subject: 'Şifre Sıfırlama Talebi',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Merhaba ${user.name || 'Değerli Kullanıcı'}!</h2>
            <p>Şifrenizi sıfırlamak için bir talepte bulundunuz.</p>
            <p>Şifrenizi sıfırlamak için lütfen aşağıdaki butona tıklayın:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Şifremi Sıfırla
              </a>
            </div>
            <p>Veya aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:</p>
            <p>${resetUrl}</p>
            <p>Bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
            <p>Saygılarımızla,<br>Business Portal Ekibi</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('E-posta gönderimi sırasında hata oluştu:', error);
      throw new InternalServerErrorException('E-posta gönderimi sırasında bir hata oluştu');
    }
  }
}
