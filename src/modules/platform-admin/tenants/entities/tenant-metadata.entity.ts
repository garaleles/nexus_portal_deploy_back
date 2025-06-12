import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionPlan } from '../../subscription-plans/entities/subscription-plan.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum TenantType {
  CORPORATE = 'corporate',
  INDIVIDUAL = 'individual'
}

export enum SubscriptionPlanType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

@Entity('tenant_metadata')
export class TenantMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  // İletişim bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  // Kişi bilgileri
  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  // Tenant tipi ve kurumsal bilgiler
  @Column({
    type: 'enum',
    enum: TenantType,
    default: TenantType.INDIVIDUAL
  })
  tenantType: TenantType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  taxOffice: string;

  // Eskiden kullanılan industry string alanı kaldırıldı
  // Artık sadece industryId kullanılıyor
  @Column({ type: 'uuid', nullable: true })
  industryId: string;

  // Abonelik/Plan bilgileri
  // Eskiden kullanılan planType enumı kaldırıldı
  // Artık abonelik planı için subscriptionPlanId ve ilişkisi kullanılıyor

  @Column({ type: 'uuid', nullable: true })
  subscriptionPlanId: string;

  @ManyToOne(() => SubscriptionPlan, { nullable: true, eager: true })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'varchar', length: 20, nullable: true })
  subscriptionDuration: string; // 1month, 3months, 6months, 1year

  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndDate: Date;

  @Column({ type: 'boolean', default: false })
  paymentStatus: boolean;

  // Özelleştirme bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  primaryColor: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  secondaryColor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customDomain: string;

  // Kullanım bilgileri
  @Column({ type: 'int', default: 0 })
  activeUserCount: number;

  @Column({ type: 'int', default: 10 })
  userQuota: number;

  // Durum bilgileri
  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING
  })
  status: TenantStatus;

  @Column({ type: 'text', nullable: true })
  suspensionReason: string;

  // Admin kullanıcı referansı
  @Column({ type: 'uuid', nullable: true })
  adminUserId: string;

  // Keycloak kullanıcı ID'si (tenant admin için)
  @Column({ type: 'varchar', length: 255, nullable: true })
  keycloakId: string;

  // Veritabanı bilgileri (eğer her tenant için ayrı DB kullanılacaksa)
  @Column({ type: 'varchar', length: 100, nullable: true })
  databaseName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  databaseConnectionString: string;

  // Zaman damgaları
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
