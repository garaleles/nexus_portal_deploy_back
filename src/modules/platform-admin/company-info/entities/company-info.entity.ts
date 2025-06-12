import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_info')
export class CompanyInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  taxOffice: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  googleMapsApiKey: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  locationLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  locationLng: number;

  // Bank 1 bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  bank1Name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank1AccountHolder: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank1AccountNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank1IBAN: string;

  // Bank 2 bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  bank2Name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank2AccountHolder: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank2AccountNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank2IBAN: string;

  // Sosyal medya linkları
  @Column({ type: 'varchar', length: 255, nullable: true })
  whatsapp: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facebook: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitter: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagram: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtube: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedin: string;

  // İçerik bilgileri
  @Column({ type: 'text', nullable: true })
  footerText: string;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({ type: 'text', nullable: true })
  mission: string;

  @Column({ type: 'text', nullable: true })
  vision: string;

  // Logo bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  logoPublicId: string;

  @Column({
    type: 'varchar',
    length: 500,
    default: '/assets/images/noImage.png'
  })
  logoUrl: string;

  // Fatura logosu bilgileri
  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceLogoPublicId: string;

  @Column({
    type: 'varchar',
    length: 500,
    default: '/assets/images/noImage.png'
  })
  invoiceLogoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 