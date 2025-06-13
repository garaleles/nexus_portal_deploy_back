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

    // Ayrı parametreleri öncelikle kullan
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbUsername = process.env.DB_USERNAME;
    const dbPassword = process.env.DB_PASSWORD;
    const dbDatabase = process.env.DB_DATABASE;

    if (dbHost && dbUsername && dbPassword && dbDatabase) {
        logger.log('📡 Using separate DB parameters for connection...');
        logger.log(`📡 DB_HOST: ${dbHost}`);
        logger.log(`📡 DB_PORT: ${dbPort}`);
        logger.log(`📡 DB_USERNAME: ${dbUsername}`);
        logger.log(`📡 DB_DATABASE: ${dbDatabase}`);
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
            maxQueryExecutionTime: 5000,
            connectTimeoutMS: 30000,
            retryAttempts: 5,
            retryDelay: 3000,
            keepConnectionAlive: false,
            ssl: {
                rejectUnauthorized: false
            }, // Render.com için basit SSL config
            autoLoadEntities: true,
            applicationName: 'Nexus Business Portal API',
        };
    }

    // Fallback: DATABASE_URL kullan
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
            ssl: {
                rejectUnauthorized: false
            }, // Render.com için basit SSL config
            autoLoadEntities: true,
            applicationName: 'Nexus Business Portal API',
        };
    }

    // Final fallback: localhost
    logger.log('📡 Using localhost fallback...');
    return {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'business_portal_man_db',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
        maxQueryExecutionTime: 5000,
        connectTimeoutMS: 30000,
        retryAttempts: 5,
        retryDelay: 3000,
        keepConnectionAlive: false,
        ssl: {
            rejectUnauthorized: false
        }, // Render.com için basit SSL config
        autoLoadEntities: true,
        applicationName: 'Nexus Business Portal API',
    };
});