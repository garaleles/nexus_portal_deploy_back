import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string; // Sistemde kullanım için tekil kod (basic, premium, enterprise)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 5 })
  userQuota: number;

  @Column({ type: 'varchar', length: 20, default: 'monthly' })
  billingCycle: string; // monthly, quarterly, biannual, annual

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  features: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
