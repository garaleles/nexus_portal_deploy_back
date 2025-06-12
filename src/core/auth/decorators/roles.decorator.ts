import { SetMetadata } from '@nestjs/common';
import { PlatformUserRole } from '../../../modules/platform-admin/platform-users/entities/platform-user.entity';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: PlatformUserRole[]) => SetMetadata(ROLES_KEY, roles);
