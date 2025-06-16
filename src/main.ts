import 'dotenv/config'; // Ortam değişkenlerini en başta yükle

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { PlatformUserSeeder } from './database/seeders/platform-user.seeder';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create(AppModule, {
            logger: ['error', 'warn', 'log'],
        });

        // Global prefixes
        app.setGlobalPrefix('api');

        // CORS ayarları - Railway deployment için
        app.enableCors({
            origin: process.env.NODE_ENV === 'production'
                ? [
                    process.env.FRONTEND_URL,
                    'https://business-portal-frontend-production.up.railway.app',
                    'https://*.up.railway.app'
                ]
                : ['http://localhost:4200', 'http://127.0.0.1:4200'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['Authorization'],
        });

        // Güvenlik önlemleri
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"] // Resimler için de https ve data URIs izin ver
                }
            }
        }));

        // Cookie parser middleware
        app.use(cookieParser());

        // Validasyon pipe'ı
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true, // DTO'da tanımlanmayan özellikleri kaldırır
            transform: true, // Gelen verileri otomatik olarak DTO tipine dönüştürür
            forbidNonWhitelisted: true, // Tanımlanmayan özellikleri içeren istekleri reddeder
        }));

        // Uygulama portu
        const port = process.env.PORT || 3000;
        await app.listen(port, '0.0.0.0');

        logger.log(`🚀 Application is running on port ${port} - v1.0.2 - TENANT_FIX`);
        logger.log(`🔗 Application URL: ${await app.getUrl()}`);
        logger.log(`❤️ Health check available at: ${await app.getUrl()}/api/health`);

        // Super Admin kullanıcısını asenkron olarak oluştur - uygulama başlatmayı engellemez
        setImmediate(async () => {
            try {
                logger.log('🔄 Süper admin kullanıcısı kontrol ediliyor...');
                const platformUserSeeder = app.get(PlatformUserSeeder);
                await platformUserSeeder.seed();
                logger.log('✅ Süper admin kullanıcı oluşturma işlemi tamamlandı.');
            } catch (error) {
                logger.error('❌ Süper admin kullanıcısı oluşturulurken hata:', error.message);
                // Uygulamayı durdurmaya gerek yok, sadece log
            }
        });

    } catch (error) {
        logger.error('❌ Uygulama başlatılırken hata oluştu:', error);
        process.exit(1);
    }
}

bootstrap();
