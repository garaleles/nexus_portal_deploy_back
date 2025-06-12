import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailConfigSeeder } from './email-config.seeder';
import { PlatformUserSeeder } from './platform-user.seeder';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        private readonly emailConfigSeeder: EmailConfigSeeder,
        private readonly platformUserSeeder: PlatformUserSeeder,
    ) {}

    /**
     * Uygulama başlatıldığında otomatik olarak çalışan metod
     */
    async onModuleInit() {
        try {
            this.logger.log('Başlangıç verilerini oluşturma başlıyor...');
            await this.seed();
            this.logger.log('Başlangıç verileri başarıyla oluşturuldu!');
        } catch (error) {
            this.logger.error(`❌ Başlangıç verileri yükleme hatası: ${error.message}`);
        }
    }

    /**
     * Tüm seeder'ları çalıştıran ana metod
     */
    async seed() {
        // E-posta yapılandırmasını oluştur
        await this.emailConfigSeeder.seed();

        // Platform kullanıcılarını oluştur
        await this.platformUserSeeder.seed();

        // Diğer seeder'lar burada çağrılabilir
        // await this.otherSeeder.seed();
    }
}
