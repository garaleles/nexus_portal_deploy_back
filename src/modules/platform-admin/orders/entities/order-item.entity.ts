import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
import { SubscriptionPlan } from '../../subscription-plans/entities/subscription-plan.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 500 })
  image: string;

  // İlişkiler
  @ManyToOne(() => Order, order => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid' })
  productId: string;

  // Satın alınan subscription plan
  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'uuid', nullable: true })
  subscriptionPlanId: string;

  // Helper methods
  getTotalPrice(): number {
    return this.price * this.quantity;
  }
} 