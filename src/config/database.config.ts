import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// TypeORM bağlantı dinleyicisi
export class TypeOrmConfigService {
    private readonly logger = new Logger(TypeOrmConfigService.name);

    // Modül başlatıldığında çağrılır
    async onModuleInit() {
        this.logger.log('📊 PostgreSQL database connection established successfully!');
    }

    // Uygulama başlatıldığında çağrılır
    async onApplicationBootstrap() {
        this.logger.log('🚀 Database is ready to use');
    }
}

export default registerAs('database', (): TypeOrmModuleOptions => {
    const logger = new Logger('Database');

    logger.log('🔄 Attempting to connect to PostgreSQL database...');

    // Render.com için Internal Database URL kullanımı (makale önerisi)
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        logger.log('📡 Using DATABASE_URL (Internal) for connection...');
        logger.log(`📡 DATABASE_URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

        return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: false,

            // Render.com için başlangıç retry stratejisi
            retryAttempts: 10,
            retryDelay: 3000,

            // Render.com için SSL yapılandırması (makale kritik önerisi)
            ssl: {
                rejectUnauthorized: false  // Render'ın internal CA için gerekli
            },

            // Render.com için proactive connection pool management
            extra: {
                // Connection Pool Ayarları (Makale Tablo 2)
                max: 20,                    // Veritabanı planına göre ayarla
                min: 0,                     // Kaynak tasarrufu için
                idleTimeoutMillis: 60000,   // 1 dakika - network'ün kesmesinden önce pool temizlesin
                connectionTimeoutMillis: 10000,  // 10 saniye bağlantı timeout
                acquireTimeoutMillis: 10000,     // Pool'dan bağlantı alma timeout

                // Render network için ek ayarlar
                statement_timeout: 60000,         // 60 saniye query timeout
                query_timeout: 60000,            // 60 saniye query timeout
                application_name: 'Nexus Business Portal API',

                // Keep-alive ayarları (zombi bağlantıları önler)
                keepAlive: true,
                keepAliveInitialDelayMillis: 0
            },

            autoLoadEntities: true,
            maxQueryExecutionTime: 60000,  // 60 saniye max query time
        };
    }

    // Fallback: Ayrı parametreler (Internal URL preferred)
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbUsername = process.env.DB_USERNAME;
    const dbPassword = process.env.DB_PASSWORD;
    const dbDatabase = process.env.DB_DATABASE;

    if (dbHost && dbUsername && dbPassword && dbDatabase) {
        logger.log('📡 Using separate DB parameters for connection...');
        logger.log(`📡 DB_HOST: ${dbHost}`);

        return {
            type: 'postgres',
            host: dbHost,
            port: parseInt(dbPort || '5432', 10),
            username: dbUsername,
            password: dbPassword,
            database: dbDatabase,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: false,

            // Render.com için başlangıç retry stratejisi
            retryAttempts: 10,
            retryDelay: 3000,

            // Render.com için SSL yapılandırması
            ssl: {
                rejectUnauthorized: false
            },

            // Render.com için connection pool
            extra: {
                max: 20,
                min: 0,
                idleTimeoutMillis: 60000,
                connectionTimeoutMillis: 10000,
                acquireTimeoutMillis: 10000,
                statement_timeout: 60000,
                query_timeout: 60000,
                application_name: 'Nexus Business Portal API',
                keepAlive: true,
                keepAliveInitialDelayMillis: 0
            },

            autoLoadEntities: true,
            maxQueryExecutionTime: 60000,
        };
    }

    // Emergency fallback
    logger.error('❌ No valid database configuration found!');
    throw new Error('DATABASE_URL or separate DB parameters must be provided');
});