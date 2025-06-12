import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');
    const ivString = this.configService.get<string>('ENCRYPTION_IV');

    console.log('🔐 EncryptionService init - ENCRYPTION_KEY:', keyString ? `${keyString.substring(0, 8)}...` : 'UNDEFINED');
    console.log('🔐 EncryptionService init - ENCRYPTION_IV:', ivString ? `${ivString.substring(0, 8)}...` : 'UNDEFINED');

    if (!keyString || !ivString) {
      throw new Error('ENCRYPTION_KEY ve ENCRYPTION_IV environment değişkenleri tanımlanmamış');
    }

    // Key ve IV'yi Buffer'a çevir (32 byte key, 16 byte IV for AES-256-CBC)
    this.key = Buffer.from(keyString, 'hex');
    this.iv = Buffer.from(ivString, 'hex');

    console.log('🔐 EncryptionService init - Key length:', this.key.length, 'bytes');
    console.log('🔐 EncryptionService init - IV length:', this.iv.length, 'bytes');

    // Key ve IV boyut kontrolü
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY 32 byte (64 hex karakter) olmalıdır');
    }
    if (this.iv.length !== 16) {
      throw new Error('ENCRYPTION_IV 16 byte (32 hex karakter) olmalıdır');
    }

    console.log('✅ EncryptionService başarıyla başlatıldı');
  }

  /**
 * Metni şifreler
 */
  encrypt(text: string): string {
    if (!text) return text;

    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Şifreleme hatası:', error);
      throw new Error('Veri şifrelenemedi');
    }
  }

  /**
 * Şifreli metni çözer
 */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;

    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Şifre çözme hatası:', error);
      throw new Error('Veri çözülemedi');
    }
  }

  /**
 * Nesne içindeki belirtilen alanları şifreler
 */
  encryptFields(data: any, fields: string[]): any {
    console.log('🔐 encryptFields - Gelen data:', data);
    console.log('🔐 encryptFields - Şifrelenecek fields:', fields);

    const encryptedData = { ...data };

    fields.forEach(field => {
      if (encryptedData[field]) {
        const originalValue = encryptedData[field];
        const encryptedValue = this.encrypt(encryptedData[field]);
        encryptedData[field] = encryptedValue;
        console.log(`🔐 ${field}: "${originalValue}" → "${encryptedValue}"`);
      } else {
        console.log(`⚠️  ${field}: Boş veya undefined, şifrelenmedi`);
      }
    });

    console.log('🔐 encryptFields - Sonuç:', encryptedData);
    return encryptedData;
  }

  /**
   * Nesne içindeki belirtilen alanları çözer
   */
  decryptFields(data: any, fields: string[]): any {
    console.log('🔓 decryptFields - Gelen data:', data);
    console.log('🔓 decryptFields - Çözülecek fields:', fields);

    const decryptedData = { ...data };

    fields.forEach(field => {
      if (decryptedData[field]) {
        const originalValue = decryptedData[field];
        const decryptedValue = this.decrypt(decryptedData[field]);
        decryptedData[field] = decryptedValue;
        console.log(`🔓 ${field}: "${originalValue}" → "${decryptedValue}"`);
      } else {
        console.log(`⚠️  ${field}: Boş veya undefined, çözülmedi`);
      }
    });

    console.log('🔓 decryptFields - Sonuç:', decryptedData);
    return decryptedData;
  }
} 