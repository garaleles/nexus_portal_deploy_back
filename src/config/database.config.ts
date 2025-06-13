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
        return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV !== 'production',
            logger: 'advanced-console',
            maxQueryExecutionTime: 1000,
            connectTimeoutMS: 60000,
            retryAttempts: 30,
            retryDelay: 10000,
            keepConnectionAlive: true,
            extra: {
                max: 5,
                min: 1,
                idleTimeoutMillis: 10000,
                connectionTimeoutMillis: 60000,
                acquireTimeoutMillis: 60000,
                ssl: process.env.NODE_ENV === 'production'
                    ? {
                        rejectUnauthorized: false,
                        checkServerIdentity: () => undefined,
                        sslmode: 'require'
                    }
                    : false,
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
        logging: process.env.NODE_ENV !== 'production',
        logger: 'advanced-console',
        maxQueryExecutionTime: 1000,
        connectTimeoutMS: 60000,
        retryAttempts: 30,
        retryDelay: 10000,
        keepConnectionAlive: true,
        extra: {
            max: 5,
            min: 1,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 60000,
            acquireTimeoutMillis: 60000,
            ssl: process.env.DB_SSL === 'true'
                ? {
                    rejectUnauthorized: false,
                    checkServerIdentity: () => undefined,
                    sslmode: 'require'
                }
                : false,
        },
        autoLoadEntities: true,
        applicationName: 'Nexus Business Portal API',
    };
});