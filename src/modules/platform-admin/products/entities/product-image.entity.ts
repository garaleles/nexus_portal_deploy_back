import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string; // Cloudinary public ID

  @Column({ type: 'varchar', length: 500 })
  url: string; // Cloudinary URL

  @Column({ type: 'varchar', length: 500 })
  secureUrl: string; // Cloudinary secure URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  altText: string; // Resim alt text'i

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // Resim sıralaması

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // Ana resim mi?

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  format: string; // jpg, png, etc.

  @Column({ type: 'int', nullable: true })
  bytes: number; // Dosya boyutu

  // Product ile ilişki
  @ManyToOne(() => Product, product => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid' })
  productId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 