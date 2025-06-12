import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

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
  app.use(helmet());
  
  // Validasyon pipe'ı
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO'da tanımlanmayan özellikleri kaldırır
    transform: true, // Gelen verileri otomatik olarak DTO tipine dönüştürür
    forbidNonWhitelisted: true, // Tanımlanmayan özellikleri içeren istekleri reddeder
  }));
  
  // Uygulama portu
  await app.listen(process.env.PORT || 3000);
  
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
