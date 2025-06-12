import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { SubscriptionPlan } from '../../subscription-plans/entities/subscription-plan.entity';
import { ProductImage } from './product-image.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  productCode: string; // Benzersiz ürün kodu

  @Column({ type: 'varchar', length: 255 })
  name: string; // Ürün adı

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string; // URL dostu slug

  @Column({ type: 'text' })
  description: string; // Zengin metin açıklama

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  price: number; // Seçilen subscription plan'ın fiyatı

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Ürün aktif mi?

  @Column({ type: 'varchar', length: 255, nullable: true })
  metaTitle: string; // SEO için

  @Column({ type: 'text', nullable: true })
  metaDescription: string; // SEO için

  @Column({ type: 'json', nullable: true })
  tags: string[]; // Ürün etiketleri

  @Column({ type: 'int', default: 0 })
  viewCount: number; // Görüntülenme sayısı

  // Subscription Plan ile ilişki
  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'uuid', nullable: true })
  subscriptionPlanId: string;

  // Product Images ile ilişki
  @OneToMany(() => ProductImage, image => image.product, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE'
  })
  images: ProductImage[];

  // Audit alanları
  @Column({ type: 'uuid', nullable: true })
  createdBy: string; // Ürünü oluşturan kullanıcı ID

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string; // Ürünü güncelleyen kullanıcı ID

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Helper methods
  getPrimaryImage(): ProductImage | undefined {
    return this.images?.find(image => image.isPrimary) || this.images?.[0];
  }

  getTotalImageCount(): number {
    return this.images?.length || 0;
  }

  isAvailable(): boolean {
    return this.isActive && this.subscriptionPlan?.isActive;
  }
} 