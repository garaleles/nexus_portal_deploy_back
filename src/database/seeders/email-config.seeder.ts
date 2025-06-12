import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { EmailConfig } from '../../modules/platform-admin/email-configs/entities/email-config.entity';

@Injectable()
export class EmailConfigSeeder {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;
    private readonly iv: Buffer;

    constructor(
        @InjectRepository(EmailConfig)
        private readonly emailConfigRepository: Repository<EmailConfig>,
        private readonly configService: ConfigService,
    ) {
        // Şifreleme için gerekli anahtarları al
        const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-must-be-32-chars-in-length!';
        const encryptionIv = this.configService.get<string>('ENCRYPTION_IV') || 'default-iv-16chrs';

        this.key = Buffer.from(encryptionKey);
        this.iv = Buffer.from(encryptionIv);
    }

    async seed(): Promise<void> {
        // Veritabanında aktif bir email_config var mı kontrol et
        const existingConfig = await this.emailConfigRepository.findOne({
            where: { isActive: true },
        });

        // Eğer aktif bir yapılandırma zaten varsa, tekrar ekleme
        if (existingConfig) {
            console.log('Email config already exists, skipping seeding.');
            return;
        }

        // .env dosyasından ayarları al
        const mailConfig = {
            host: this.configService.get<string>('MAIL_HOST'),
            port: this.configService.get<number>('MAIL_PORT'),
            secure: this.configService.get<string>('MAIL_SECURE') === 'true',
            user: this.configService.get<string>('MAIL_USER'),
            password: this.encrypt(this.configService.get<string>('MAIL_PASSWORD')),
            fromName: this.configService.get<string>('MAIL_FROM_NAME'),
            fromAddress: this.configService.get<string>('MAIL_FROM_ADDRESS'),
            frontendUrl: this.configService.get<string>('FRONTEND_URL'),
            isActive: true,
        };

        try {
            // Yeni yapılandırmayı kaydet
            await this.emailConfigRepository.save(mailConfig);
            console.log('📧 Email configuration seeded successfully.');
        } catch (error) {
            console.error('❌ Failed to seed email configuration:', error.message);
        }
    }

    /**
     * Şifreleme için kullanılan metod
     * @param text Şifrelenecek metin
     */
    private encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
}
