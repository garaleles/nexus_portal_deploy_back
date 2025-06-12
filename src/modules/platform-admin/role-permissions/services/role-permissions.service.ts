import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { Endpoint } from '../entities/endpoint.entity';
import { PlatformUserRole } from '../../platform-users/entities/platform-user.entity';
import { CreateRolePermissionDto, UpdateRolePermissionDto, BulkRolePermissionDto } from '../dto/role-permission.dto';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(Endpoint)
    private endpointsRepository: Repository<Endpoint>,
  ) { }

  async create(createRolePermissionDto: CreateRolePermissionDto): Promise<RolePermission> {
    // Endpoint var mı kontrol et
    const endpoint = await this.endpointsRepository.findOne({
      where: { id: createRolePermissionDto.endpointId }
    });

    if (!endpoint) {
      throw new NotFoundException('Endpoint bulunamadı');
    }

    // Aynı rol ve endpoint kombinasyonu var mı kontrol et
    const existing = await this.rolePermissionsRepository.findOne({
      where: {
        role: createRolePermissionDto.role,
        endpointId: createRolePermissionDto.endpointId
      }
    });

    if (existing) {
      throw new ConflictException('Bu rol için endpoint izni zaten mevcut');
    }

    const rolePermission = this.rolePermissionsRepository.create(createRolePermissionDto);
    return await this.rolePermissionsRepository.save(rolePermission);
  }

  async createBulk(bulkRolePermissionDto: BulkRolePermissionDto): Promise<RolePermission[]> {
    const { role, endpointIds, canRead = true, canWrite = false, canDelete = false } = bulkRolePermissionDto;

    // Endpoint'lerin varlığını kontrol et
    const endpoints = await this.endpointsRepository.find({
      where: { id: In(endpointIds) }
    });

    if (endpoints.length !== endpointIds.length) {
      throw new NotFoundException('Bazı endpoint\'ler bulunamadı');
    }

    // Mevcut izinleri kontrol et
    const existingPermissions = await this.rolePermissionsRepository.find({
      where: {
        role,
        endpointId: In(endpointIds)
      }
    });

    const existingEndpointIds = existingPermissions.map(p => p.endpointId);
    const newEndpointIds = endpointIds.filter(id => !existingEndpointIds.includes(id));

    // Yeni izinleri oluştur
    const newPermissions = newEndpointIds.map(endpointId =>
      this.rolePermissionsRepository.create({
        role,
        endpointId,
        canRead,
        canWrite,
        canDelete
      })
    );

    const savedPermissions = await this.rolePermissionsRepository.save(newPermissions);
    this.logger.log(`${role} rolü için ${savedPermissions.length} yeni izin eklendi`);

    return savedPermissions;
  }

  async findAll(): Promise<RolePermission[]> {
    return await this.rolePermissionsRepository.find({
      relations: ['endpoint'],
      order: {
        role: 'ASC',
        endpoint: {
          category: 'ASC',
          path: 'ASC'
        }
      }
    });
  }

  async findByRole(role: PlatformUserRole): Promise<RolePermission[]> {
    return await this.rolePermissionsRepository.find({
      where: { role, isActive: true },
      relations: ['endpoint'],
      order: {
        endpoint: {
          category: 'ASC',
          path: 'ASC'
        }
      }
    });
  }

  async findByEndpoint(endpointId: string): Promise<RolePermission[]> {
    return await this.rolePermissionsRepository.find({
      where: { endpointId, isActive: true },
      relations: ['endpoint'],
      order: { role: 'ASC' }
    });
  }

  async findOne(id: string): Promise<RolePermission> {
    const rolePermission = await this.rolePermissionsRepository.findOne({
      where: { id },
      relations: ['endpoint']
    });

    if (!rolePermission) {
      throw new NotFoundException('Rol izni bulunamadı');
    }

    return rolePermission;
  }

  async update(id: string, updateRolePermissionDto: UpdateRolePermissionDto): Promise<RolePermission> {
    this.logger.debug(`Update method başladı - ID: ${id}`);
    this.logger.debug(`DTO: ${JSON.stringify(updateRolePermissionDto)}`);

    const rolePermission = await this.findOne(id);
    this.logger.debug(`Mevcut izin bulundu: ${JSON.stringify(rolePermission)}`);

    Object.assign(rolePermission, updateRolePermissionDto);
    this.logger.debug(`Güncellenen izin: ${JSON.stringify(rolePermission)}`);

    const result = await this.rolePermissionsRepository.save(rolePermission);
    this.logger.debug(`Kayıt işlemi tamamlandı`);

    return result;
  }

  async remove(id: string): Promise<void> {
    const rolePermission = await this.findOne(id);
    await this.rolePermissionsRepository.remove(rolePermission);
  }

  async removeByRole(role: PlatformUserRole): Promise<void> {
    await this.rolePermissionsRepository.delete({ role });
  }

  async removeByEndpoint(endpointId: string): Promise<void> {
    await this.rolePermissionsRepository.delete({ endpointId });
  }

  async checkPermission(role: PlatformUserRole, path: string, method: string): Promise<boolean> {
    this.logger.debug(`🔍 checkPermission başladı - Role: ${role}, Path: ${path}, Method: ${method}`);

    // Önce endpoint'i bul
    const endpoint = await this.endpointsRepository.findOne({
      where: { path, method: method as any }
    });

    this.logger.debug(`🔍 Endpoint bulundu: ${endpoint ? endpoint.id : 'YOK'} - ${endpoint?.description || 'Açıklama yok'}`);

    if (!endpoint) {
      // Endpoint tanımlı değilse, varsayılan olarak erişim verme
      this.logger.warn(`⚠️ Endpoint bulunamadı: ${method} ${path} - Erişim reddedildi`);
      return false;
    }

    // Authentication gerektirmeyen endpoint'ler için true döndür
    if (!endpoint.requiresAuth) {
      this.logger.debug(`✅ Endpoint auth gerektirmiyor - Erişim verildi`);
      return true;
    }

    // Bu rol için bu endpoint'e izin var mı kontrol et
    const permission = await this.rolePermissionsRepository.findOne({
      where: {
        role,
        endpointId: endpoint.id,
        isActive: true
      }
    });

    this.logger.debug(`🔍 Permission kaydı bulundu: ${permission ? permission.id : 'YOK'}`);
    if (permission) {
      this.logger.debug(`✅ Permission detayları - canRead: ${permission.canRead}, canWrite: ${permission.canWrite}, canDelete: ${permission.canDelete}`);
    }

    const result = !!permission;
    this.logger.debug(`🎯 Final result: ${result ? 'ERİŞİM VERİLDİ' : 'ERİŞİM REDDEDİLDİ'}`);

    return result;
  }

  async getPermissionMatrix(): Promise<any> {
    const endpoints = await this.endpointsRepository.find({
      where: { isActive: true },
      order: {
        category: 'ASC',
        path: 'ASC'
      }
    });

    const rolePermissions = await this.rolePermissionsRepository.find({
      where: { isActive: true },
      relations: ['endpoint']
    });

    const matrix: any = {};

    // Her kategori için grupla
    for (const endpoint of endpoints) {
      if (!matrix[endpoint.category]) {
        matrix[endpoint.category] = [];
      }

      const endpointData = {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        permissions: {}
      };

      // Her rol için izinleri kontrol et
      for (const role of Object.values(PlatformUserRole)) {
        const permission = rolePermissions.find(
          p => p.role === role && p.endpointId === endpoint.id
        );

        endpointData.permissions[role] = {
          hasAccess: !!permission,
          canRead: permission?.canRead || false,
          canWrite: permission?.canWrite || false,
          canDelete: permission?.canDelete || false
        };
      }

      matrix[endpoint.category].push(endpointData);
    }

    return matrix;
  }

  async seedDefaultPermissions(): Promise<void> {
    this.logger.log('Varsayılan rol izinleri oluşturuluyor...');

    const endpoints = await this.endpointsRepository.find();

    // Super Admin - Tüm izinler
    for (const endpoint of endpoints) {
      const existing = await this.rolePermissionsRepository.findOne({
        where: {
          role: PlatformUserRole.SUPER_ADMIN,
          endpointId: endpoint.id
        }
      });

      if (!existing) {
        const permission = this.rolePermissionsRepository.create({
          role: PlatformUserRole.SUPER_ADMIN,
          endpointId: endpoint.id,
          canRead: true,
          canWrite: true,
          canDelete: true
        });
        await this.rolePermissionsRepository.save(permission);
      }
    }

    // Platform Admin - Çoğu izin (sistem yönetimi hariç)
    for (const endpoint of endpoints) {
      if (endpoint.category === 'Sistem Başlatma') continue;

      const existing = await this.rolePermissionsRepository.findOne({
        where: {
          role: PlatformUserRole.PLATFORM_ADMIN,
          endpointId: endpoint.id
        }
      });

      if (!existing) {
        const permission = this.rolePermissionsRepository.create({
          role: PlatformUserRole.PLATFORM_ADMIN,
          endpointId: endpoint.id,
          canRead: true,
          canWrite: !endpoint.path.includes('DELETE') && !endpoint.actionName.includes('remove'),
          canDelete: false
        });
        await this.rolePermissionsRepository.save(permission);
      }
    }

    // Support Agent - Sadece okuma izinleri
    const supportEndpoints = endpoints.filter(e =>
      e.category === 'Tenant Yönetimi' ||
      e.category === 'Kullanıcı Yönetimi' ||
      e.category === 'Destek' ||
      (e.method === 'GET' && !e.actionName.includes('remove'))
    );

    for (const endpoint of supportEndpoints) {
      const existing = await this.rolePermissionsRepository.findOne({
        where: {
          role: PlatformUserRole.SUPPORT_AGENT,
          endpointId: endpoint.id
        }
      });

      if (!existing) {
        const permission = this.rolePermissionsRepository.create({
          role: PlatformUserRole.SUPPORT_AGENT,
          endpointId: endpoint.id,
          canRead: true,
          canWrite: false,
          canDelete: false
        });
        await this.rolePermissionsRepository.save(permission);
      }
    }

    // Content Manager - İçerik yönetim izinleri
    const contentEndpoints = endpoints.filter(e =>
      e.category === 'Şirket Bilgi Yönetimi' ||
      e.category === 'Ürün Yönetimi' ||
      e.category === 'Sektör Yönetimi' ||
      e.category === 'Email Yapılandırma'
    );

    for (const endpoint of contentEndpoints) {
      const existing = await this.rolePermissionsRepository.findOne({
        where: {
          role: PlatformUserRole.CONTENT_MANAGER,
          endpointId: endpoint.id
        }
      });

      if (!existing) {
        const permission = this.rolePermissionsRepository.create({
          role: PlatformUserRole.CONTENT_MANAGER,
          endpointId: endpoint.id,
          canRead: true,
          canWrite: !endpoint.actionName.includes('remove'),
          canDelete: false
        });
        await this.rolePermissionsRepository.save(permission);
      }
    }

    this.logger.log('Varsayılan rol izinleri oluşturuldu');
  }
}