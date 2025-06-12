import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ContactMessageReply } from './contact-message-reply.entity';

export enum ContactMessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied'
}

export enum ContactMessageSubject {
  QUOTE_MANAGEMENT = 'Teklif Yönetimi Hk.',
  ORDER_MANAGEMENT = 'Sipariş Yönetimi Hk.',
  ECOMMERCE = 'E-Ticaret Hk.',
  ACCOUNTING = 'Ön Muhasebe Hk.',
  OTHER = 'Diğer'
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyName: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: ContactMessageSubject,
    default: ContactMessageSubject.OTHER
  })
  subject: ContactMessageSubject;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.UNREAD
  })
  status: ContactMessageStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContactMessageReply, reply => reply.contactMessage)
  replies: ContactMessageReply[];
} 