import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export enum PlatformUserRole {
  SUPER_ADMIN = 'superAdmin',
  PLATFORM_ADMIN = 'platformAdmin',
  SUPPORT_AGENT = 'supportAgent',
  CONTENT_MANAGER = 'contentManager',
}

export enum PlatformUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('platform_users')
export class PlatformUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: PlatformUserRole,
    default: PlatformUserRole.PLATFORM_ADMIN
  })
  role: PlatformUserRole;

  @Column({
    type: 'enum',
    enum: PlatformUserStatus,
    default: PlatformUserStatus.ACTIVE
  })
  status: PlatformUserStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  lastLoginAt: Date;

  @Column({ nullable: true })
  profilePicUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: object;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true, type: 'timestamptz' })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  keycloakId: string;

  @Column({ nullable: true })
  companyName: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Şifre değişmişse ve şifre varsa hashle
    if (this.password && this.password.trim() !== '') {
      // Zaten hash'lenmiş mi kontrol et (bcrypt hash'leri '$2a$', '$2b$', or '$2y$' ile başlar)
      if (!/^\$2[aby]\$\d+\$/.test(this.password)) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
    }
  }

  // Şifre doğrulama metodu
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Şifre karşılaştırma metodu (TenantUser ile uyumluluk için)
  async comparePassword(candidatePassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      console.error('Şifre karşılaştırma hatası:', error);
      return false;
    }
  }
}