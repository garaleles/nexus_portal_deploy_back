import { IsString, IsEmail, IsOptional, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { ContactMessageSubject, ContactMessageStatus } from '../entities/contact-message.entity';

export class CreateContactMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsEnum(ContactMessageSubject)
  subject: ContactMessageSubject;

  @IsNotEmpty()
  @IsString()
  message: string;
}

export class UpdateContactMessageDto {
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;
}

export class ReplyContactMessageDto {
  @IsNotEmpty()
  @IsString()
  replyMessage: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fromName?: string;
}

export class ContactMessageFilterDto {
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;

  @IsOptional()
  @IsEnum(ContactMessageSubject)
  subject?: ContactMessageSubject;

  @IsOptional()
  @IsString()
  search?: string;
} 