import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CorporatePageType {
  PRIVACY_POLICY = 'gizlilik-politikasi',
  TERMS_OF_SERVICE = 'kullanim-sartlari',
  COOKIE_POLICY = 'cerez-politikasi',
  KVKK = 'kvkk'
}

@Entity('corporate_pages')
export class CorporatePage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CorporatePageType,
    unique: true
  })
  type: CorporatePageType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string; // Zengin metin içeriği

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  metaTitle: string;

  @Column({ type: 'text', nullable: true })
  metaDescription: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 