import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { PlatformUser, PlatformUserRole, PlatformUserStatus } from '../../modules/platform-admin/platform-users/entities/platform-user.entity';
import { KeycloakService } from '@core/auth/services/keycloak.service';

// Keycloak kullanıcı oluşturma parametreleri
interface CreateKeycloakUserParams {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    role: string;
}

@Injectable()
export class PlatformUserSeeder implements OnApplicationBootstrap {
    private readonly logger = new Logger(PlatformUserSeeder.name);
    private seedExecuted = false;

    constructor(
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: Repository<PlatformUser>,
        private readonly configService: ConfigService,
        private readonly keycloakService: KeycloakService,
    ) { }

    /**
     * Tüm modüller başlatıldıktan sonra çağrılır
     */
    async onApplicationBootstrap() {
        // Seed işlemi sadece bir kez çalışacak
        if (!this.seedExecuted) {
            this.seedExecuted = true;
            await this.initializeSuperAdmin();
        }
    }

    /**
     * Kullanıcıyı Keycloak'ta oluşturur ve gerekirse bekler
     */
    private async registerUserInKeycloak(params: CreateKeycloakUserParams): Promise<string | null> {
        try {
            // Keycloak servisinin initialize olmasını bekle
            let attempts = 0;
            const maxAttempts = 5;

            while (!this.keycloakService.isInitialized() && attempts < maxAttempts) {
                attempts++;
                // Artan bekleme süreleri (1s, 2s, 3s...)
                await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            }

            if (!this.keycloakService.isInitialized()) {
                this.logger.error(`Keycloak servisi ${maxAttempts} denemede initialize edilemedi`);
                return null;
            }

            // Doğrudan Keycloak'ta kullanıcı oluştur/güncelle
            const result = await this.keycloakService.createOrUpdateUser({
                email: params.email,
                username: params.email,
                firstName: params.firstName,
                lastName: params.lastName,
            }, params.password, undefined, params.role);

            if (result.user && result.user.id) {
                // Sadece yeni kullanıcılar için verification email gönder
                if (result.isNewUser) {
                    this.logger.log(`Verification email gönderilecek (yeni kullanıcı): ${params.email}`);
                } else {
                    this.logger.log(`Mevcut kullanıcı güncellemesi (email gönderilmedi): ${params.email}`);
                }

                return result.user.id;
            } else {
                this.logger.warn(`Keycloak'ta kullanıcı oluşturulamadı: ${params.email}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Keycloak'ta kullanıcı oluşturulurken hata: ${error.message}`);
            return null;
        }
    }

    /**
     * Keycloak ID'yi veritabanındaki kullanıcı kaydına ekler/günceller
     */
    private async updateKeycloakIdInDatabase(email: string, keycloakId: string): Promise<void> {
        try {
            // Email'e göre kullanıcıyı bul
            const user = await this.platformUserRepository.findOne({ where: { email } });

            if (user) {
                // Keycloak ID'yi güncelle
                user.keycloakId = keycloakId;
                await this.platformUserRepository.save(user);
                this.logger.log(`Kullanıcı ${email} için keycloakId güncellendi: ${keycloakId}`);
            } else {
                this.logger.warn(`${email} email'ine sahip kullanıcı veritabanında bulunamadı`);
            }
        } catch (error) {
            this.logger.error(`Keycloak ID güncelleme hatası: ${error.message}`);
        }
    }

    /**
     * Seed işlemini çağıran public metod - geriye uyumluluk için
     */
    async seed(): Promise<void> {
        await this.initializeSuperAdmin();
    }

    /**
     * Super Admin kullanıcısını Keycloak ve veritabanında oluşturur
     */
    private async initializeSuperAdmin(): Promise<void> {
        try {
            // Süper admin için gerekli bilgileri al
            const superAdminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL') || 'superadmin@nexus-businessportal.com';
            const plainPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD') || 'SuperAdmin123!';
            const superAdminName = this.configService.get<string>('SUPER_ADMIN_NAME') || 'Super';
            const superAdminLastName = this.configService.get<string>('SUPER_ADMIN_LASTNAME') || 'Admin';

            // Öncelikle Keycloak'ta kullanıcıyı oluştur/güncelle ve keycloakId al
            const keycloakId = await this.registerUserInKeycloak({
                email: superAdminEmail,
                firstName: superAdminName,
                lastName: superAdminLastName,
                password: plainPassword,
                role: PlatformUserRole.SUPER_ADMIN
            });

            // Veritabanında süper admin kullanıcısı var mı kontrol et
            const existingUser = await this.platformUserRepository.findOne({
                where: { email: superAdminEmail }
            });

            if (!existingUser) {
                // Kullanıcı yoksa oluştur
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

                // Varsayılan Super Admin kullanıcısı oluştur
                const superAdmin = new PlatformUser();
                superAdmin.name = superAdminName;
                superAdmin.lastName = superAdminLastName;
                superAdmin.email = superAdminEmail;
                superAdmin.password = hashedPassword;
                superAdmin.role = PlatformUserRole.SUPER_ADMIN;
                superAdmin.status = PlatformUserStatus.ACTIVE;
                superAdmin.isActive = true;
                superAdmin.isVerified = true;
                superAdmin.companyName = 'Platform Yönetimi';

                // Eğer keycloakId varsa, onu da ekle
                if (keycloakId) {
                    superAdmin.keycloakId = keycloakId;
                }

                await this.platformUserRepository.save(superAdmin);
                this.logger.log(`Super Admin veritabanında oluşturuldu: ${superAdminEmail}`);
            } else if (keycloakId && (!existingUser.keycloakId || existingUser.keycloakId !== keycloakId)) {
                // Kullanıcı var ama keycloakId güncellenecek
                await this.updateKeycloakIdInDatabase(superAdminEmail, keycloakId);
            }
        } catch (error) {
            this.logger.error(`Super Admin oluşturulurken hata: ${error.message}`);
        }
    }
}
