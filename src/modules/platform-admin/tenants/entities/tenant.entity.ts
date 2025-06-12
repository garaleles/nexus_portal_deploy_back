import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { TenantMetadata, TenantStatus } from './tenant-metadata.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING
  })
  status: TenantStatus;

  // Her tenant'ın kendi veritabanı şeması olabilir
  @Column({ type: 'varchar', length: 100, unique: true })
  databaseSchema: string;

  // Tenant domain bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subdomain: string;

  // Tenant yöneticisi
  @Column({ type: 'uuid', nullable: true })
  adminUserId: string;

  // Keycloak kullanıcı ID'si (tenant admin için)
  @Column({ type: 'varchar', length: 255, nullable: true })
  keycloakId: string;

  // Tenant metadata ile one-to-one ilişki
  @OneToOne(() => TenantMetadata, { cascade: true, eager: true })
  @JoinColumn()
  metadata: TenantMetadata;

  @Column({ type: 'uuid', nullable: true })
  metadataId: string;

  // Zaman damgaları
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Tenant'ın aktif olup olmadığını kontrol eden helper method
  isActive(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  // Tenant'ın test ortamında olup olmadığını kontrol eden method
  isProduction(): boolean {
    return this.status === TenantStatus.ACTIVE && this.metadata?.paymentStatus;
  }
} 