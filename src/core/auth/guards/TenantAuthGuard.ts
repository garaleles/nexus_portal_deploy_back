import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TenantAuthGuard extends AuthGuard('jwt-tenant') {}
