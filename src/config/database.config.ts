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

    // DATABASE_URL varsa onu kullan, yoksa ayrı parametreleri kullan
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        logger.log('📡 Using DATABASE_URL for connection...');
        logger.log(`📡 DATABASE_URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);
        logger.log(`📡 DATABASE_URL length: ${databaseUrl.length}`);
        logger.log(`📡 DATABASE_URL starts with: ${databaseUrl.substring(0, 20)}`);
        return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: false, // Logging'i kapat
            maxQueryExecutionTime: 5000,
            connectTimeoutMS: 30000,
            retryAttempts: 5,
            retryDelay: 3000,
            keepConnectionAlive: false, // KeepAlive'i kapat
            extra: {
                max: 3, // Connection pool'u çok küçük yap
                min: 0,
                idleTimeoutMillis: 5000,
                connectionTimeoutMillis: 30000,
                ssl: {
                    rejectUnauthorized: false
                }, // SSL'yi Render.com için açtık
            },
            autoLoadEntities: true,
            applicationName: 'Nexus Business Portal API',
        };
    }

    // Fallback: Ayrı parametreler kullan
    logger.log('📡 Using separate DB parameters for connection...');
    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'business_portal_man_db',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false, // Logging'i kapat
        maxQueryExecutionTime: 5000,
        connectTimeoutMS: 30000,
        retryAttempts: 5,
        retryDelay: 3000,
        keepConnectionAlive: false, // KeepAlive'i kapat
        extra: {
            max: 3, // Connection pool'u çok küçük yap
            min: 0,
            idleTimeoutMillis: 5000,
            connectionTimeoutMillis: 30000,
            ssl: {
                rejectUnauthorized: false
            }, // SSL'yi Render.com için açtık
        },
        autoLoadEntities: true,
        applicationName: 'Nexus Business Portal API',
    };
});