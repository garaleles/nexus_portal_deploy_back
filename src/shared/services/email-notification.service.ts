import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailConfigsService } from '../../modules/platform-admin/email-configs/email-configs.service';

export interface ContactMessageReplyEmailData {
    customerName: string;
    customerEmail: string;
    originalSubject: string;
    originalMessage: string;
    replyMessage: string;
    companyName?: string;
    fromName: string;
    attachmentUrl?: string;
}

export interface OrderEmailData {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    companyName: string;
    total: number;
    paymentMethod: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    paymentDetails?: {
        paymentId?: string;
        conversationId?: string;
        installment?: number;
        cardType?: string;
    };
    bankInfo?: {
        bankName: string;
        accountHolder: string;
        iban: string;
        accountNumber: string;
    };
}

export interface TenantWelcomeEmailData {
    tenantName: string;
    tenantSlug: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
    companyName?: string;
    subscriptionPlan?: string;
    portalUrl: string;
    subscriptionUrl?: string;
    orderNumber?: string;
}

@Injectable()
export class EmailNotificationService {
    private readonly logger = new Logger(EmailNotificationService.name);

    constructor(
        private readonly emailConfigsService: EmailConfigsService
    ) { }

    /**
     * Sipariş onay e-postası gönder
     */
    async sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
        try {
            const config = await this.emailConfigsService.getDecryptedConfig();
            const transporter = await this.createTransporter();

            const subject = `Sipariş Onayı - ${orderData.orderNumber}`;
            const html = this.generateOrderConfirmationHTML(orderData);

            const mailOptions = {
                from: `${config.fromName} <${config.fromAddress}>`,
                to: orderData.customerEmail,
                subject,
                html
            };

            await transporter.sendMail(mailOptions);
            this.logger.log(`Order confirmation email sent to ${orderData.customerEmail} for order ${orderData.orderNumber}`);

            return true;
        } catch (error) {
            this.logger.error(`Failed to send order confirmation email for order ${orderData.orderNumber}:`, error);
            return false;
        }
    }

    /**
     * Banka havalesi ödeme bilgileri e-postası gönder
     */
    async sendBankTransferEmail(orderData: OrderEmailData): Promise<boolean> {
        try {
            const config = await this.emailConfigsService.getDecryptedConfig();
            const transporter = await this.createTransporter();

            const subject = `Ödeme Bilgileri - ${orderData.orderNumber}`;
            const html = this.generateBankTransferHTML(orderData);

            const mailOptions = {
                from: `${config.fromName} <${config.fromAddress}>`,
                to: orderData.customerEmail,
                subject,
                html
            };

            await transporter.sendMail(mailOptions);
            this.logger.log(`Bank transfer email sent to ${orderData.customerEmail} for order ${orderData.orderNumber}`);

            return true;
        } catch (error) {
            this.logger.error(`Failed to send bank transfer email for order ${orderData.orderNumber}:`, error);
            return false;
        }
    }

    /**
     * Kredi kartı ödeme onayı e-postası gönder
     */
    async sendCreditCardPaymentEmail(orderData: OrderEmailData): Promise<boolean> {
        try {
            const config = await this.emailConfigsService.getDecryptedConfig();
            const transporter = await this.createTransporter();

            const subject = `Ödeme Onayı - ${orderData.orderNumber}`;
            const html = this.generateCreditCardPaymentHTML(orderData);

            const mailOptions = {
                from: `${config.fromName} <${config.fromAddress}>`,
                to: orderData.customerEmail,
                subject,
                html
            };

            await transporter.sendMail(mailOptions);
            this.logger.log(`Credit card payment email sent to ${orderData.customerEmail} for order ${orderData.orderNumber}`);

            return true;
        } catch (error) {
            this.logger.error(`Failed to send credit card payment email for order ${orderData.orderNumber}:`, error);
            return false;
        }
    }

    /**
     * İletişim mesajına cevap e-postası gönder
     */
    async sendContactMessageReply(replyData: ContactMessageReplyEmailData): Promise<boolean> {
        try {
            const config = await this.emailConfigsService.getDecryptedConfig();
            const transporter = await this.createTransporter();

            const subject = `Re: ${replyData.originalSubject} - Cevabınız`;
            const html = this.generateContactMessageReplyHTML(replyData);

            const mailOptions = {
                from: `${replyData.fromName} <${config.fromAddress}>`,
                to: replyData.customerEmail,
                subject,
                html
            };

            await transporter.sendMail(mailOptions);
            this.logger.log(`Contact message reply sent to ${replyData.customerEmail}`);

            return true;
        } catch (error) {
            this.logger.error(`Failed to send contact message reply to ${replyData.customerEmail}:`, error);
            return false;
        }
    }

    /**
     * Tenant hoş geldin e-postası gönder (Admin bilgileri ile)
     */
    async sendTenantWelcomeEmail(tenantData: TenantWelcomeEmailData): Promise<boolean> {
        try {
            this.logger.log(`🔧 EMAIL SERVICE - sendTenantWelcomeEmail başlatılıyor: ${tenantData.adminEmail}`);

            this.logger.log(`🔧 EMAIL SERVICE - Email config alınıyor...`);
            const config = await this.emailConfigsService.getDecryptedConfig();
            this.logger.log(`🔧 EMAIL SERVICE - Email config alındı:`, {
                host: config.host,
                port: config.port,
                secure: config.secure,
                user: config.user,
                fromName: config.fromName,
                fromAddress: config.fromAddress
            });

            this.logger.log(`🔧 EMAIL SERVICE - Transporter oluşturuluyor...`);
            const transporter = await this.createTransporter();
            this.logger.log(`🔧 EMAIL SERVICE - Transporter oluşturuldu.`);

            const subject = `🎉 Hesabınız Aktifleştirildi - ${tenantData.tenantName}`;
            this.logger.log(`🔧 EMAIL SERVICE - HTML oluşturuluyor...`);
            const html = this.generateTenantWelcomeHTML(tenantData);
            this.logger.log(`🔧 EMAIL SERVICE - HTML oluşturuldu (${html.length} karakter).`);

            const mailOptions = {
                from: `${config.fromName} <${config.fromAddress}>`,
                to: tenantData.adminEmail,
                subject,
                html
            };

            this.logger.log(`📤 EMAIL SERVICE - Email gönderiliyor:`, {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject,
                htmlLength: mailOptions.html.length
            });

            await transporter.sendMail(mailOptions);
            this.logger.log(`✅ EMAIL SERVICE - Tenant welcome email sent to ${tenantData.adminEmail} for tenant ${tenantData.tenantName}`);

            return true;
        } catch (error) {
            this.logger.error(`❌ EMAIL SERVICE - Failed to send tenant welcome email for tenant ${tenantData.tenantName}:`, error);
            this.logger.error(`❌ EMAIL SERVICE - Error details:`, error.message);
            this.logger.error(`❌ EMAIL SERVICE - Error stack:`, error.stack);
            return false;
        }
    }

    /**
 * Nodemailer transporter oluştur
 */
    private async createTransporter() {
        const config = await this.emailConfigsService.getDecryptedConfig();

        // Gmail SMTP için doğru konfigürasyon
        const transportConfig: any = {
            host: config.host,
            port: config.port,
            auth: {
                user: config.user,
                pass: config.password,
            },
        };

        // Port 587 için STARTTLS kullan, port 465 için SSL kullan
        if (config.port === 587) {
            transportConfig.secure = false;
            transportConfig.requireTLS = true;
        } else if (config.port === 465) {
            transportConfig.secure = true;
        } else {
            // Diğer portlar için config'deki ayarı kullan
            transportConfig.secure = config.secure;
        }

        this.logger.log(`🔧 EMAIL SERVICE - Transport config:`, {
            host: transportConfig.host,
            port: transportConfig.port,
            secure: transportConfig.secure,
            requireTLS: transportConfig.requireTLS,
            user: transportConfig.auth.user
        });

        return nodemailer.createTransport(transportConfig);
    }

    /**
     * Sipariş onay e-postası HTML template
     */
    private generateOrderConfirmationHTML(orderData: OrderEmailData): string {
        const itemsHTML = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${this.formatPrice(item.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${this.formatPrice(item.total)}</td>
      </tr>
    `).join('');

        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sipariş Onayı</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">
                ✅ Siparişiniz Onaylandı!
            </h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Sipariş Detayları
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <strong>Sipariş Numarası:</strong> ${orderData.orderNumber}<br>
                    <strong>Firma:</strong> ${orderData.companyName}<br>
                    <strong>Müşteri:</strong> ${orderData.customerName}<br>
                    <strong>E-posta:</strong> ${orderData.customerEmail}<br>
                    <strong>Ödeme Yöntemi:</strong> ${orderData.paymentMethod === 'bank_transfer' ? 'Banka Havalesi' : 'Kredi Kartı'}
                </div>

                <h3 style="color: #1f2937; margin-top: 25px;">Sipariş Edilen Ürünler</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Ürün</th>
                            <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Adet</th>
                            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Birim Fiyat</th>
                            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f3f4f6; font-weight: bold;">
                            <td colspan="3" style="padding: 12px 8px; text-align: right; border-top: 2px solid #e5e7eb;">
                                Genel Toplam:
                            </td>
                            <td style="padding: 12px 8px; text-align: right; border-top: 2px solid #e5e7eb; color: #059669;">
                                ${this.formatPrice(orderData.total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                <h3 style="color: #1e40af; margin-top: 0;">Sonraki Adımlar</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${orderData.paymentMethod === 'bank_transfer' ?
                '<li>Ödeme bilgileri ayrı bir e-posta ile gönderilecektir</li><li>Ödemenizi yaptıktan sonra siparişiniz işleme alınacaktır</li>' :
                '<li>Ödemeniz başarıyla alınmıştır</li><li>Siparişiniz işleme alınmaktadır</li>'
            }
                    <li>Sipariş durumu güncellemeleri e-posta ile bildirilecektir</li>
                    <li>Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
                <p><strong>Business Portal</strong> - E-ticaret Çözümleri</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Banka havalesi bilgileri HTML template
     */
    private generateBankTransferHTML(orderData: OrderEmailData): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ödeme Bilgileri</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #dc2626; text-align: center; margin-bottom: 30px;">
                💳 Ödeme Bilgileri
            </h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Sipariş: ${orderData.orderNumber}
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <strong>Firma:</strong> ${orderData.companyName}<br>
                    <strong>Müşteri:</strong> ${orderData.customerName}<br>
                    <strong>Ödenecek Tutar:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">${this.formatPrice(orderData.total)}</span>
                </div>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <h3 style="color: #92400e; margin-top: 0;">🏦 Banka Bilgileri</h3>
                ${orderData.bankInfo ? `
                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="font-weight: bold; padding: 5px 0;">Banka:</td>
                            <td style="padding: 5px 0;">${orderData.bankInfo.bankName}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding: 5px 0;">Hesap Sahibi:</td>
                            <td style="padding: 5px 0;">${orderData.bankInfo.accountHolder}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding: 5px 0;">IBAN:</td>
                            <td style="padding: 5px 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${orderData.bankInfo.iban}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding: 5px 0;">Hesap No:</td>
                            <td style="padding: 5px 0; font-family: monospace;">${orderData.bankInfo.accountNumber}</td>
                        </tr>
                    </table>
                </div>
                ` : '<p>Banka bilgileri yüklenirken hata oluştu.</p>'}
            </div>

            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                <h3 style="color: #991b1b; margin-top: 0;">⚠️ Önemli Uyarılar</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #7f1d1d;">
                    <li><strong>Havale/EFT açıklamasına mutlaka sipariş numaranızı yazınız:</strong> ${orderData.orderNumber}</li>
                    <li>Ödemenizi tam tutarı (${this.formatPrice(orderData.total)}) olarak yapınız</li>
                    <li>Ödeme sonrası siparişiniz 1-2 iş günü içinde işleme alınır</li>
                    <li>Farklı tutarda ödeme yapılması durumunda siparişiniz gecikebilir</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <p>Ödeme yaptıktan sonra dekont görselini bize gönderebilirsiniz.</p>
                <p><strong>Business Portal</strong> - E-ticaret Çözümleri</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Kredi kartı ödeme onayı HTML template
     */
    private generateCreditCardPaymentHTML(orderData: OrderEmailData): string {
        const itemsHTML = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${this.formatPrice(item.total)}</td>
      </tr>
    `).join('');

        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ödeme Onayı</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #059669; text-align: center; margin-bottom: 30px;">
                ✅ Ödemeniz Başarıyla Alındı!
            </h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Ödeme Detayları
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <strong>Sipariş Numarası:</strong> ${orderData.orderNumber}<br>
                    <strong>Firma:</strong> ${orderData.companyName}<br>
                    <strong>Müşteri:</strong> ${orderData.customerName}<br>
                    <strong>Ödeme Tutarı:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">${this.formatPrice(orderData.total)}</span><br>
                    ${orderData.paymentDetails ? `
                    <strong>Ödeme ID:</strong> ${orderData.paymentDetails.paymentId}<br>
                    <strong>İşlem ID:</strong> ${orderData.paymentDetails.conversationId}<br>
                    ${orderData.paymentDetails.installment && orderData.paymentDetails.installment > 1 ?
                    `<strong>Taksit:</strong> ${orderData.paymentDetails.installment} ay<br>` : ''
                }
                    ${orderData.paymentDetails.cardType ?
                    `<strong>Kart Türü:</strong> ${orderData.paymentDetails.cardType}<br>` : ''
                }
                    ` : ''}
                </div>

                <h3 style="color: #1f2937; margin-top: 25px;">Satın Alınan Ürünler</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Ürün</th>
                            <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Adet</th>
                            <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>

            <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                <h3 style="color: #047857; margin-top: 0;">🎉 Başarıyla Tamamlandı</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Ödemeniz güvenli İyzico altyapısı ile alınmıştır</li>
                    <li>Siparişiniz işleme alınmaktadır</li>
                    <li>Ürünleriniz en kısa sürede hazırlanacaktır</li>
                    <li>Durum güncellemeleri e-posta ile bildirilecektir</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
                <p><strong>Business Portal</strong> - E-ticaret Çözümleri</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * İletişim mesajı cevabı HTML template
     */
    private generateContactMessageReplyHTML(replyData: ContactMessageReplyEmailData): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mesajınıza Cevap</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">
                💬 Mesajınıza Cevap
            </h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Merhaba ${replyData.customerName}!
                </h2>
                
                <p style="margin-bottom: 20px; font-size: 16px;">
                    "<strong>${replyData.originalSubject}</strong>" konulu mesajınıza cevabımız aşağıdadır:
                </p>

                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <h3 style="color: #1e40af; margin-top: 0;">📝 Cevabımız</h3>
                    <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937;">
${replyData.replyMessage}
                    </div>
                </div>

                ${replyData.attachmentUrl ? `
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #374151; margin-top: 0;">📎 Ek Dosya</h4>
                    <a href="${replyData.attachmentUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                        📄 Eki Görüntüle/İndir
                    </a>
                </div>
                ` : ''}

                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #9ca3af; margin: 20px 0;">
                    <h4 style="color: #374151; margin-top: 0;">📋 Orijinal Mesajınız</h4>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Konu:</strong> ${replyData.originalSubject}</p>
                    <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 14px; color: #6b7280; max-height: 150px; overflow-y: auto;">
${replyData.originalMessage}
                    </div>
                </div>
            </div>

            <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                <h3 style="color: #047857; margin-top: 0;">📞 İletişim</h3>
                <p style="margin: 10px 0;">Başka sorularınız varsa bizimle iletişime geçmekten çekinmeyin:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>İletişim formu üzerinden yeni mesaj gönderebilirsiniz</li>
                    <li>Bu e-postaya doğrudan yanıt verebilirsiniz</li>
                    <li>Telefon ile destek hattımızı arayabilirsiniz</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <p><strong>Teşekkürler!</strong></p>
                <p><strong>${replyData.fromName}</strong></p>
                <p><strong>Business Portal</strong> - E-ticaret Çözümleri</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Tenant hoş geldin e-postası HTML template
     */
    private generateTenantWelcomeHTML(tenantData: TenantWelcomeEmailData): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hesabınız Aktifleştirildi</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #059669; text-align: center; margin-bottom: 30px;">
                🎉 Hoş Geldiniz! Hesabınız Aktifleştirildi
            </h1>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Merhaba ${tenantData.adminFirstName} ${tenantData.adminLastName}!
                </h2>
                
                <p style="margin-bottom: 20px; font-size: 16px;">
                    <strong>${tenantData.companyName || tenantData.tenantName}</strong> için hesabınız başarıyla oluşturuldu ve aktifleştirildi! 
                    ${tenantData.orderNumber ? `Sipariş numaranız: <strong>${tenantData.orderNumber}</strong>` : ''}
                </p>

                <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #059669; margin-bottom: 20px;">
                    <p style="margin: 0; color: #047857; font-size: 14px;">
                        <strong>📧 Not:</strong> Aşağıdaki giriş bilgilerini kullanabilmek için önce e-posta doğrulama işlemini tamamlamanız gerekmektedir.
                    </p>
                </div>

                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <h3 style="color: #1e40af; margin-top: 0;">🔐 Giriş Bilgileriniz</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="font-weight: bold; padding: 8px 0; width: 120px;">E-posta:</td>
                            <td style="padding: 8px 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${tenantData.adminEmail}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding: 8px 0;">Şifre:</td>
                            <td style="padding: 8px 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px; font-size: 18px; letter-spacing: 2px;">${tenantData.adminPassword}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding: 8px 0;">Tenant:</td>
                            <td style="padding: 8px 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${tenantData.tenantSlug}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                    <h3 style="color: #92400e; margin-top: 0;">⚠️ ÖNEMLİ: E-posta Doğrulama Gerekli</h3>
                    <p style="margin: 10px 0; color: #78350f; font-weight: bold;">
                        Bu oturum açma verileri, tarafınıza ayrı olarak yollanmış/yollanacak e-posta adresinizi doğrulama linki ile doğruladıktan sonra aktif olacaktır.
                    </p>
                    <p style="margin: 10px 0; color: #78350f; font-size: 14px;">
                        Lütfen e-posta gelen kutunuzu (ve spam klasörünüzü) kontrol ederek e-posta doğrulama işlemini tamamlayınız.
                    </p>
                </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0;">🚀 Giriş Adresleri</h3>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #059669; margin-bottom: 5px;">📊 Yönetim Portalı</h4>
                    <p style="margin: 5px 0;">Siparişlerinizi takip edin, ayarlarınızı yönetin:</p>
                    <a href="${tenantData.portalUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                        ${tenantData.portalUrl}
                    </a>
                </div>

                ${tenantData.subscriptionUrl ? `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #7c3aed; margin-bottom: 5px;">💼 ${tenantData.subscriptionPlan || 'Abonelik'} Platformu</h4>
                    <p style="margin: 5px 0;">Satın aldığınız abonelik paketine erişin:</p>
                    <a href="${tenantData.subscriptionUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                        ${tenantData.subscriptionUrl}
                    </a>
                </div>
                ` : ''}
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <h3 style="color: #92400e; margin-top: 0;">🔒 Güvenlik Önerileri</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
                    <li><strong>İlk girişinizde şifrenizi değiştirmeniz önerilir</strong></li>
                    <li>Şifrenizi kimseyle paylaşmayınız</li>
                    <li>Güvenli bir konumdan giriş yapınız</li>
                    <li>Hesabınızı düzenli olarak kontrol ediniz</li>
                </ul>
            </div>

            <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                <h3 style="color: #047857; margin-top: 0;">📞 Destek</h3>
                <p style="margin: 10px 0;">Herhangi bir sorunuz veya yardıma ihtiyacınız olduğunda bizimle iletişime geçebilirsiniz:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>E-posta ile destek talebi oluşturabilirsiniz</li>
                    <li>Portal üzerinden canlı destek hattımızı kullanabilirsiniz</li>
                    <li>Dokümantasyon ve video eğitimlerimize erişebilirsiniz</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                <p><strong>Business Portal ekibine hoş geldiniz!</strong></p>
                <p>Bu e-posta otomatik olarak gönderilmiştir. Giriş bilgilerinizi güvenli bir yerde saklayınız.</p>
                <p><strong>Business Portal</strong> - E-ticaret Çözümleri</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Fiyat formatla
     */
    private formatPrice(price: number): string {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(price);
    }
} 