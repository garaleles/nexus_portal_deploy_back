import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IyzipayInfoService } from '../../platform-admin/iyzipay-info/iyzipay-info.service';
import { PaymentRequestDto, InstallmentInfoRequestDto, ThreedsInitializeRequestDto, ThreedsCompleteRequestDto } from '../../platform-admin/iyzipay-info/dto/iyzipay-payment.dto';

@Controller('public/iyzipay')
export class PublicIyzipayController {
  constructor(
    private readonly iyzipayInfoService: IyzipayInfoService,
    private readonly configService: ConfigService
  ) { }

  @Post('calculate-installments')
  @HttpCode(HttpStatus.OK)
  async calculateInstallments(@Body() installmentRequest: InstallmentInfoRequestDto) {
    return await this.iyzipayInfoService.calculateInstallments(
      installmentRequest.price,
      installmentRequest.binNumber
    );
  }

  @Get('available-installments')
  async getAvailableInstallments(@Query('amount') amount: number) {
    return await this.iyzipayInfoService.getAvailableInstallments(amount);
  }

  @Post('test-payment')
  @HttpCode(HttpStatus.OK)
  async testPayment(@Body() paymentRequest: PaymentRequestDto) {
    console.log('🧪 TEST_PAYMENT - Test ödeme başlıyor...');
    console.log('🧪 TEST_PAYMENT - Gelen request:', JSON.stringify(paymentRequest, null, 2));

    try {
      const result = await this.iyzipayInfoService.processPayment(paymentRequest);
      console.log('🧪 TEST_PAYMENT - İyzico cevabı:', JSON.stringify(result, null, 2));
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('🧪 TEST_PAYMENT - Hata yakalandı:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  @Post('process-payment')
  @HttpCode(HttpStatus.OK)
  async processPayment(@Body() paymentRequest: PaymentRequestDto) {
    return await this.iyzipayInfoService.processPayment(paymentRequest);
  }

  @Get('active-config')
  async getActiveConfig() {
    const config = await this.iyzipayInfoService.findActive();
    // Güvenlik için sensitive bilgileri çıkar (apiKey ve secretKey hiçbir zaman frontend'e gönderilmez)
    return {
      currency: config.currency,
      installment: config.installment,
      isTestMode: config.isTestMode,
      installmentOptions: config.installmentOptions,
      baseUrl: config.baseUrl, // Frontend'in hangi environment'da olduğunu bilmesi için
    };
  }

  @Post('3ds-callback')
  @HttpCode(HttpStatus.OK)
  async handleThreedsCallbackPost(@Body() callbackData: any, @Res() response: any) {
    await this.processThreedsCallback(callbackData, {}, response);
  }

  @Get('3ds-callback')
  @HttpCode(HttpStatus.OK)
  async handleThreedsCallbackGet(@Query() queryData: any, @Res() response: any) {
    await this.processThreedsCallback({}, queryData, response);
  }

  private async processThreedsCallback(callbackData: any, queryData: any, response: any) {
    // POST veya GET ile gelen verileri birleştir
    const allData = { ...queryData, ...callbackData };

    console.log('🔄 3DS_CALLBACK - İyzico callback alındı:');
    console.log('🔄 3DS_CALLBACK - Query Data:', JSON.stringify(queryData, null, 2));
    console.log('🔄 3DS_CALLBACK - Body Data:', JSON.stringify(callbackData, null, 2));
    console.log('🔄 3DS_CALLBACK - Merged Data:', JSON.stringify(allData, null, 2));

    try {
      // Callback verilerini query string'e çevir
      const queryParams = new URLSearchParams();

      // İyzico'dan gelen tüm parametreleri ekle
      Object.keys(allData).forEach(key => {
        if (allData[key] !== undefined && allData[key] !== null) {
          queryParams.append(key, allData[key].toString());
        }
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
      const frontendCallbackUrl = `${frontendUrl}/payment/callback?${queryParams.toString()}`;

      console.log('🔄 3DS_CALLBACK - Frontend callback URL:', frontendCallbackUrl);

      // Frontend callback sayfasına redirect et
      response.redirect(frontendCallbackUrl);

    } catch (error) {
      console.error('❌ 3DS_CALLBACK - Hata:', error);

      // Hata durumunda da frontend'e yönlendir
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
      const errorUrl = `${frontendUrl}/payment/callback?error=callback_error&message=${encodeURIComponent(error.message)}`;
      response.redirect(errorUrl);
    }
  }

  @Post('threeds-initialize')
  @HttpCode(HttpStatus.OK)
  async initializeThreedsPayment(@Body() threedsRequest: ThreedsInitializeRequestDto) {
    return await this.iyzipayInfoService.initializeThreedsPayment(threedsRequest);
  }

  @Post('threeds-complete')
  @HttpCode(HttpStatus.OK)
  async completeThreedsPayment(@Body() completeRequest: ThreedsCompleteRequestDto) {
    return await this.iyzipayInfoService.completeThreedsPayment(completeRequest);
  }
} 