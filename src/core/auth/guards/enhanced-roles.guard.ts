import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformUserRole } from '../../../modules/platform-admin/platform-users/entities/platform-user.entity';
import { RolePermissionsService } from '../../../modules/platform-admin/role-permissions/services/role-permissions.service';

export const ROLES_KEY = 'roles';

@Injectable()
export class EnhancedRolesGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedRolesGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(RolePermissionsService)
    private rolePermissionsService: RolePermissionsService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.route?.path || request.url;
    const method = request.method;

    if (!user) {
      throw new ForbiddenException('Kullanıcı bilgisi bulunamadı');
    }

    // Keycloak token'dan rol bilgisini al
    const userRoles = this.extractRolesFromUser(user);

    this.logger.log(`🔍 ENHANCED_ROLES_GUARD - User: ${user.email || user.preferred_username}`);
    this.logger.log(`🔍 ENHANCED_ROLES_GUARD - Path: ${path}, Method: ${method}`);
    this.logger.log(`🔍 ENHANCED_ROLES_GUARD - User Roles: ${userRoles.join(', ')}`);
    this.logger.log(`🔍 ENHANCED_ROLES_GUARD - Required Roles: ${requiredRoles?.join(', ') || 'None'}`);
    this.logger.log(`🔍 ENHANCED_ROLES_GUARD - User Object Keys: ${Object.keys(user).join(', ')}`);

    if (userRoles.length === 0) {
      // Tenant kullanıcısı kontrolü
      const isTenantUser = this.isTenantUser(user);
      if (isTenantUser && path.startsWith('/platform-admin')) {
        this.logger.warn(`Tenant kullanıcısı platform admin sayfasına erişmeye çalıştı: ${user.email || user.preferred_username}`);
        throw new ForbiddenException('Tenant kullanıcıları platform yönetim paneline erişemez');
      }

      if (path.startsWith('/platform-admin')) {
        throw new ForbiddenException('Platform yönetim paneline erişim için platform kullanıcısı rolü gereklidir');
      }
    }

    // Tenant kullanıcısı kontrolü - Platform admin sayfalarına erişemez
    const isTenantUser = this.isTenantUser(user);
    if (isTenantUser && path.startsWith('/platform-admin')) {
      this.logger.warn(`Tenant kullanıcısı platform admin sayfasına erişmeye çalıştı: ${user.email || user.preferred_username}`);
      throw new ForbiddenException('Tenant kullanıcıları platform yönetim paneline erişemez');
    }

    // Eğer decorator ile rol belirtilmişse, geleneksel rol kontrolü yap
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException(
          `Bu işlem için gerekli rol(ler): ${requiredRoles.join(', ')}`
        );
      }
      return true;
    }

    // Platform kullanıcısı varsa rol bazlı endpoint izin kontrolü
    if (userRoles.length > 0) {
      try {
        for (const userRole of userRoles) {
          const hasPermission = await this.rolePermissionsService.checkPermission(
            userRole,
            path,
            method
          );

          if (hasPermission) {
            return true;
          }
        }

        this.logger.warn(`İzin reddedildi: ${userRoles.join(', ')} - ${method} ${path}`);
        throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır');
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }

        // Veritabanı hatası durumunda, decorator tabanlı kontrol varsa izin ver
        this.logger.error('Rol izni kontrolünde hata:', error.message);
        return requiredRoles ? true : false;
      }
    }

    // Platform kullanıcısı değilse ve platform admin sayfası değilse, izin ver
    if (!path.startsWith('/platform-admin')) {
      return true;
    }

    return false;
  }

  private extractRolesFromUser(user: any): PlatformUserRole[] {
    const roles: PlatformUserRole[] = [];

    // 1. Önce direkt token attribute'larından rol bilgilerini çıkar
    if (user.role && Object.values(PlatformUserRole).includes(user.role as PlatformUserRole)) {
      roles.push(user.role as PlatformUserRole);
      this.logger.log(`🔍 Platform rolü direkt token'dan alındı: ${user.role}`);
    }

    // Token'daki tüm attribute'ları platform rolleri için kontrol et
    Object.keys(user).forEach(key => {
      const value = user[key];

      // Attribute adı platform rolü mü?
      if (Object.values(PlatformUserRole).includes(key as PlatformUserRole) && !roles.includes(key as PlatformUserRole)) {
        roles.push(key as PlatformUserRole);
        this.logger.log(`🔍 Platform rolü attribute adından alındı: ${key}`);
      }

      // Attribute değeri platform rolü mü?
      if (typeof value === 'string' && Object.values(PlatformUserRole).includes(value as PlatformUserRole) && !roles.includes(value as PlatformUserRole)) {
        roles.push(value as PlatformUserRole);
        this.logger.log(`🔍 Platform rolü attribute değerinden alındı: ${key} = ${value}`);
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

  private isTenantUser(user: any): boolean {
    // Tenant kullanıcısı kontrolü
    // Eğer kullanıcının tenantId'si varsa ve platform rolleri yoksa tenant kullanıcısıdır
    const hasTenantId = user.tenantId || user.tenantIdentifier;
    const platformRoles = this.extractRolesFromUser(user);

    // Ayrıca Owner_Admin rolü de tenant kullanıcısı belirtisidir
    const isTenantRole = user.role === 'Owner_Admin' ||
      (user.realm_access?.roles && user.realm_access.roles.includes('Owner_Admin'));

    // Platform rolü yoksa ve tenant bilgisi varsa, tenant kullanıcısıdır
    return (hasTenantId && platformRoles.length === 0) || isTenantRole;
  }
} 