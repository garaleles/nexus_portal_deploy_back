import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum PaymentMethod {
  CREDIT_CARD = 'kredi_karti',
  BANK = 'banka'
}

export enum OrderStatus {
  PROCESSING = 'işleniyor',
  DELIVERED = 'teslim edildi',
  CANCELLED = 'iptal edildi'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  orderNumber: string;

  // Müşteri Bilgileri (yeni eklenen alanlar)
  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string; // Firma Adı

  @Column({ type: 'varchar', length: 100 })
  firstName: string; // Adı

  @Column({ type: 'varchar', length: 100 })
  lastName: string; // Soyadı

  @Column({ type: 'varchar', length: 20 })
  phone: string; // Telefon

  @Column({ type: 'varchar', length: 255 })
  email: string; // e-posta

  @Column({ type: 'varchar', length: 255, nullable: true })
  taxOffice: string; // Vergi Dairesi

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber: string; // Vergi Numarası

  // Sektör Bilgisi
  @Column({ type: 'uuid', nullable: true })
  industryId: string;

  // Adres Bilgileri
  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  // Ödeme Bilgileri
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CREDIT_CARD
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'json', nullable: true })
  paymentResult: {
    id?: string;
    status?: string;
    update_time?: string;
    email_address?: string;
  };

  // Fiyat Bilgileri
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  // Sipariş Durumu
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PROCESSING
  })
  status: OrderStatus;

  // Ödeme Durumu
  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date;

  // Tenant Provisioning Durumu
  @Column({ type: 'boolean', default: false })
  isTenantProvisioned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  tenantProvisionedAt: Date;

  // Tenant İlişkisi
  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  tenantProvisioningStatus: 'pending' | 'provisioning' | 'completed' | 'failed';

  // Ek Bilgiler
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string;

  // İlişkiler
  @OneToMany(() => OrderItem, orderItem => orderItem.order, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE'
  })
  orderItems: OrderItem[];

  // Audit alanları
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Helper methods
  getTotalItemsCount(): number {
    return this.orderItems?.reduce((total, item) => total + item.quantity, 0) || 0;
  }

  calculateTotal(): number {
    const itemsTotal = this.orderItems?.reduce((total, item) =>
      total + (item.price * item.quantity), 0) || 0;

    return itemsTotal + (this.taxPrice || 0);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  getFullAddress(): string {
    return `${this.address}, ${this.district}/${this.city}`;
  }
} 