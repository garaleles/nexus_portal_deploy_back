import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Eğer endpoint için rol tanımlanmamışsa, herkes erişebilir
    if (!roles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Kullanıcı yoksa erişim red
    if (!user || !user.roles) {
      return false;
    }
    
    // Kullanıcının rollerini kontrol et
    // En az bir rol eşleşiyorsa erişime izin ver
    return user.roles.some((role: string) => roles.includes(role));
  }
}
