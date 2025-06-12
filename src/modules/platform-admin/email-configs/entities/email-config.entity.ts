import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_configs')
export class EmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  host: string;

  @Column({ nullable: false })
  port: number;

  @Column({ nullable: false, default: false })
  secure: boolean;

  @Column({ nullable: false })
  user: string;

  @Column({ nullable: false })
  password: string;

  @Column({ name: 'from_name', nullable: false })
  fromName: string;

  @Column({ name: 'from_address', nullable: false })
  fromAddress: string;

  @Column({ name: 'frontend_url', nullable: false })
  frontendUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
