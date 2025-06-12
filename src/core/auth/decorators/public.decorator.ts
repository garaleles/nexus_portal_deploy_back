import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator - Kimlik doğrulama gerektirmeyen rotaları işaretlemek için kullanılır
 */
export const Public = () => SetMetadata('isPublic', true);
