import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformUserRole } from '../../../modules/platform-admin/platform-users/entities/platform-user.entity';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Eğer rol gereksinimi yoksa, erişime izin ver
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Kullanıcı bilgisi bulunamadı');
    }

    // Keycloak token'dan rol bilgisini al
    const userRoles = this.extractRolesFromUser(user);

    console.log(`🔍 [RolesGuard] User: ${user.email || user.preferred_username}`);
    console.log(`🔍 [RolesGuard] Path: ${request.url}`);
    console.log(`🔍 [RolesGuard] User Roles: ${userRoles.join(', ')}`);
    console.log(`🔍 [RolesGuard] Required Roles: ${requiredRoles.join(', ')}`);

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Bu işlem için gerekli rol(ler): ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }

  private extractRolesFromUser(user: any): PlatformUserRole[] {
    const roles: PlatformUserRole[] = [];

    // 1. Önce direkt token attribute'larından rol bilgilerini çıkar
    if (user.role && Object.values(PlatformUserRole).includes(user.role as PlatformUserRole)) {
      roles.push(user.role as PlatformUserRole);
      console.log(`🔍 [RolesGuard] Platform rolü direkt token'dan alındı: ${user.role}`);
    }

    // Token'daki tüm attribute'ları platform rolleri için kontrol et
    Object.keys(user).forEach(key => {
      const value = user[key];

      // Attribute adı platform rolü mü?
      if (Object.values(PlatformUserRole).includes(key as PlatformUserRole) && !roles.includes(key as PlatformUserRole)) {
        roles.push(key as PlatformUserRole);
        console.log(`🔍 [RolesGuard] Platform rolü attribute adından alındı: ${key}`);
      }

      // Attribute değeri platform rolü mü?
      if (typeof value === 'string' && Object.values(PlatformUserRole).includes(value as PlatformUserRole) && !roles.includes(value as PlatformUserRole)) {
        roles.push(value as PlatformUserRole);
        console.log(`🔍 [RolesGuard] Platform rolü attribute değerinden alındı: ${key} = ${value}`);
      }
    });

    // 2. Keycloak token'dan rol bilgilerini çıkar (sadece bulunamazsa)
    if (roles.length === 0 && user.realm_access?.roles) {
      user.realm_access.roles.forEach((role: string) => {
        if (Object.values(PlatformUserRole).includes(role as PlatformUserRole)) {
          roles.push(role as PlatformUserRole);
        }
      });
    }

    // 3. Resource access'den de rol bilgilerini çıkar (sadece bulunamazsa)
    if (roles.length === 0 && user.resource_access) {
      Object.values(user.resource_access).forEach((resource: any) => {
        if (resource.roles) {
          resource.roles.forEach((role: string) => {
            if (Object.values(PlatformUserRole).includes(role as PlatformUserRole)) {
              roles.push(role as PlatformUserRole);
            }
          });
        }
      });
    }

    // Eğer hiç rol bulunamazsa, token'daki diğer bilgilerden rol çıkarmaya çalış
    if (roles.length === 0 && user.preferred_username) {
      // Super admin kontrolü için
      if (user.email && process.env.SUPER_ADMIN_EMAIL === user.email) {
        roles.push(PlatformUserRole.SUPER_ADMIN);
      }
    }

    return roles;
  }
} 