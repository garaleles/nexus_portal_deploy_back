import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { SupportMessage } from './support-message.entity';

export enum SupportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export enum SupportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PackageType {
  B2B_ORDER_MANAGEMENT = 'b2b-order-management',
  B2B_QUOTE_MANAGEMENT = 'b2b-quote-management',
  ECOMMERCE = 'ecommerce',
  ACCOUNTING = 'accounting'
}

@Entity('supports')
export class Support {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, { eager: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'enum',
    enum: PackageType
  })
  packageType: PackageType;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: SupportStatus,
    default: SupportStatus.PENDING
  })
  status: SupportStatus;

  @Column({
    type: 'enum',
    enum: SupportPriority,
    default: SupportPriority.MEDIUM
  })
  priority: SupportPriority;

  @Column({ nullable: true })
  assignedToAdmin: string; // Admin user ID

  @OneToMany(() => SupportMessage, message => message.support, { cascade: true })
  messages: SupportMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isUrgent: boolean;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  lastResponseAt: Date;

  @Column({ default: false })
  hasUnreadAdminMessages: boolean;

  @Column({ default: false })
  hasUnreadTenantMessages: boolean;
} 