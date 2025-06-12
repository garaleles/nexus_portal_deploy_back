import 'dotenv/config'; // Ortam değişkenlerini en başta yükle

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { PlatformUserSeeder } from './database/seeders/platform-user.seeder';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefixes
    app.setGlobalPrefix('api');

    // CORS ayarları
    app.enableCors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : ['http://localhost:4200', 'http://127.0.0.1:4200'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
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

    // Super Admin kullanıcısını doğrudan oluştur
    try {
        const logger = new Logger('Main');
        logger.log('Süper admin kullanıcısı kontrol ediliyor...');
        const platformUserSeeder = app.get(PlatformUserSeeder);
        await platformUserSeeder.seed();
        logger.log('Süper admin kullanıcı oluşturma işlemi tamamlandı.');
    } catch (error) {
        console.error('Süper admin kullanıcısı oluşturulurken hata:', error.message);
    }

    // Uygulama portu
    await app.listen(process.env.PORT || 3000, '0.0.0.0');

    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
