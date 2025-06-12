import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Endpoint } from './endpoint.entity';
import { PlatformUserRole } from '../../platform-users/entities/platform-user.entity';

@Entity('role_permissions')
@Index(['role', 'endpointId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PlatformUserRole
  })
  role: PlatformUserRole;

  @Column('uuid')
  endpointId: string;

  @ManyToOne(() => Endpoint, endpoint => endpoint.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'endpointId' })
  endpoint: Endpoint;

  @Column({ default: true })
  canRead: boolean;

  @Column({ default: false })
  canWrite: boolean;

  @Column({ default: false })
  canDelete: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 