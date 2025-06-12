import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContactMessage } from './contact-message.entity';

@Entity('contact_messages_replies')
export class ContactMessageReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contactMessageId: string;

  @ManyToOne(() => ContactMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactMessageId' })
  contactMessage: ContactMessage;

  @Column('text')
  replyMessage: string;

  @Column({ nullable: true })
  fromName: string;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentFileName: string;

  @Column({ default: true })
  emailSent: boolean;

  @Column({ nullable: true })
  sentBy: string; // Platform user who sent the reply

  @CreateDateColumn()
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
} 