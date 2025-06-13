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
        connectTimeoutMS: 30000,
        retryAttempts: 15,
        retryDelay: 5000,
        keepConnectionAlive: true,
        extra: {
            max: 10,
            ssl: process.env.DB_SSL === 'true'
                ? {
                    rejectUnauthorized: false,
                    sslmode: 'require'
                }
                : false,
        },
        autoLoadEntities: true,
        applicationName: 'Nexus Business Portal API',
    };
});