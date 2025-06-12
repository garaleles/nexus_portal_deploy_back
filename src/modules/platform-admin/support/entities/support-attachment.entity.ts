import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SupportMessage } from './support-message.entity';

@Entity('support_attachments')
export class SupportAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  supportMessageId: string;

  @ManyToOne(() => SupportMessage, message => message.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportMessageId' })
  supportMessage: SupportMessage;

  @Column()
  publicId: string; // Cloudinary public ID

  @Column()
  url: string; // Cloudinary URL

  @Column()
  secureUrl: string; // Cloudinary secure URL

  @Column()
  originalName: string; // Orijinal dosya adı

  @Column()
  mimetype: string; // Dosya tipi

  @Column('int')
  size: number; // Dosya boyutu (bytes)

  @Column({ nullable: true })
  format?: string; // Cloudinary format

  @Column('int', { nullable: true })
  width?: number; // Resim ise genişlik

  @Column('int', { nullable: true })
  height?: number; // Resim ise yükseklik

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 