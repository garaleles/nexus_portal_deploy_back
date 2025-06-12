import { SetMetadata } from '@nestjs/common';

/**
 * Belirli bir controller veya controller methodu için gerekli olan rolleri tanımlayan decorator
 *
 * @example
 * @Roles('ADMIN', 'EDITOR')
 * @Get('protected-resource')
 * getProtectedResource() {
 *   return 'This is protected';
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
