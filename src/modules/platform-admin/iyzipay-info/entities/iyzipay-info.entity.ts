import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class InstallmentOption {
  count: number;
  minAmount: number;
  maxAmount: number;
}

@Entity('iyzipay_info')
export class IyzipayInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  apiKey: string;

  @Column({ type: 'varchar', length: 500 })
  secretKey: string;

  @Column({ type: 'varchar', length: 255, default: 'https://sandbox-api.iyzipay.com' })
  baseUrl: string;

  @Column({ type: 'int', default: 1 })
  installment: number;

  @Column({ type: 'boolean', default: true })
  isTestMode: boolean;

  @Column({ type: 'varchar', length: 10, default: 'TRY' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  installmentOptions: InstallmentOption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 