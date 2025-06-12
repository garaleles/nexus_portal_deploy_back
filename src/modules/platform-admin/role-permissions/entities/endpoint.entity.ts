import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

export enum EndpointMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export enum EndpointCategory {
  TENANT_MANAGEMENT = 'Tenant Yönetimi',
  USER_MANAGEMENT = 'Kullanıcı Yönetimi',
  SUBSCRIPTION_MANAGEMENT = 'Abonelik Yönetimi',
  INDUSTRY_MANAGEMENT = 'Sektör Yönetimi',
  COMPANY_INFO_MANAGEMENT = 'Şirket Bilgi Yönetimi',
  PRODUCT_MANAGEMENT = 'Ürün Yönetimi',
  ORDER_MANAGEMENT = 'Sipariş Yönetimi',
  EMAIL_CONFIG_MANAGEMENT = 'Email Yapılandırma',
  ANALYTICS = 'Analitik',
  SUPPORT = 'Destek',
  CONTACT_MESSAGES = 'Mesaj Yönetimi',
  IYZIPAY_MANAGEMENT = 'Ödeme Yönetimi',
  ROLE_PERMISSIONS_MANAGEMENT = 'Rol İzin Yönetimi',
  ENDPOINTS_MANAGEMENT = 'Endpoint Yönetimi',
  CORPORATE_PAGES_MANAGEMENT = 'Kurumsal Sayfa Yönetimi',
  SYSTEM_INITIALIZATION = 'Sistem Başlatma'
}

@Entity('endpoints')
export class Endpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  path: string;

  @Column({
    type: 'enum',
    enum: EndpointMethod
  })
  method: EndpointMethod;

  @Column()
  controllerName: string;

  @Column()
  actionName: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: EndpointCategory
  })
  category: EndpointCategory;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  requiresAuth: boolean;

  @Column({ default: false })
  isTenantSpecific: boolean;

  @OneToMany(() => RolePermission, rolePermission => rolePermission.endpoint)
  rolePermissions: RolePermission[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 