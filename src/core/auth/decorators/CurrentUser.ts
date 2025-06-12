import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Geçerli kimliği doğrulanmış kullanıcıyı almanızı sağlayan parametre decoratorü
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUserDecorator() user: any) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
