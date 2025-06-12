import { SetMetadata } from '@nestjs/common';

/**
 * Bir endpoint'in herhangi bir kimlik doğrulaması gerektirmediğini belirten decorator
 *
 * @example
 * @Public()
 * @Get('public-resource')
 * getPublicResource() {
 *   return 'This is public';
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
