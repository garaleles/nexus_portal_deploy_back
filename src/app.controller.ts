import { Controller, Get, Req, HttpStatus, Res, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/auth/decorators/Public';
import { TenantRequest } from './core/common/middleware/tenant.middleware';
import { Response } from 'express';

@Controller()
export class AppController {
    private readonly logger = new Logger(AppController.name);

    constructor(private readonly appService: AppService) { }

    @Public()
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Public()
    @Get('health')
    healthCheck(@Res() res: Response): void {
        try {
            const healthInfo = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 3000,
                version: '1.0.0',
                service: 'business-portal-backend'
            };

            this.logger.log(`Health check successful: ${JSON.stringify(healthInfo)}`);

            res.status(HttpStatus.OK).json(healthInfo);
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`);

            res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    @Get('debug/user')
    debugUser(@Req() request: TenantRequest) {
        return {
            userId: request.userId,
            tenantId: request.tenantId,
            tenant: request.tenant ? {
                id: request.tenant.id,
                name: request.tenant.name,
                slug: request.tenant.slug,
                status: request.tenant.status
            } : null,
            isValidTenantUser: request.isValidTenantUser,
            user: request.user,
            headers: {
                authorization: request.headers.authorization ? 'Bearer ***' : 'YOK',
                'x-tenant-id': request.headers['x-tenant-id'] || 'YOK'
            }
        };
    }
}
