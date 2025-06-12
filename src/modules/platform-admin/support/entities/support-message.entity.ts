import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Support } from './support.entity';
import { SupportAttachment } from './support-attachment.entity';

@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  supportId: string;

  @ManyToOne(() => Support, support => support.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportId' })
  support: Support;

  @Column('uuid')
  senderId: string;

  @Column({ length: 255 })
  senderName: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  isFromAdmin: boolean;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isInternal: boolean;

  @Column({ nullable: true })
  attachmentUrl: string;

  @OneToMany(() => SupportAttachment, attachment => attachment.supportMessage, { cascade: true, eager: true })
  attachments: SupportAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 