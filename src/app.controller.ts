import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/auth/decorators/Public';
import { TenantRequest } from './core/common/middleware/tenant.middleware';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Public()
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Public()
    @Get('health')
    healthCheck(): { status: string; timestamp: string } {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
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
