import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ProductsService } from '../platform-admin/products/products.service';
import { SubscriptionPlansService } from '../platform-admin/subscription-plans/subscription-plans.service';
import { Product } from '../platform-admin/products/entities/product.entity';
import { SubscriptionPlan } from '../platform-admin/subscription-plans/entities/subscription-plan.entity';

@Controller('public/products')
export class PublicProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly subscriptionPlansService: SubscriptionPlansService
  ) { }

  /**
   * ⚡ RAILWAY OPTIMIZED - Aktif ürünleri listele (public)
   * DB level pagination ile optimize edildi
   */
  @Get()
  async getActiveProducts(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<{ products: Product[], total: number }> {
    console.log('🚀 PUBLIC_PRODUCTS - getActiveProducts çağrıldı');

    const limitNum = Math.min(parseInt(limit) || 12, 50); // Max 50 limit
    const offsetNum = parseInt(offset) || 0;

    console.log('📊 PUBLIC_PRODUCTS - Pagination params:', { limitNum, offsetNum, search });

    try {
      // ⚡ Railway optimizasyonu: DB level pagination
      const result = await this.productsService.findAllPaginated({
        isActive: true,
        search: search,
        limit: limitNum,
        offset: offsetNum
      });

      console.log('✅ PUBLIC_PRODUCTS - Sonuçlar:', {
        productsCount: result.products.length,
        total: result.total
      });

      return result;
    } catch (error) {
      console.error('❌ PUBLIC_PRODUCTS - Hata:', error);
      return { products: [], total: 0 };
    }
  }

  /**
   * Slug ile ürün getir (public)
   */
  @Get(':slug')
  async getProductBySlug(@Param('slug') slug: string): Promise<Product> {
    try {
      console.log('🔍 PUBLIC_PRODUCTS - getProductBySlug:', slug);
      const product = await this.productsService.findBySlug(slug);

      if (!product.isActive) {
        throw new NotFoundException('Ürün bulunamadı veya aktif değil');
      }

      return product;
    } catch (error) {
      console.error('❌ PUBLIC_PRODUCTS - Slug hatası:', error);
      throw new NotFoundException('Ürün bulunamadı');
    }
  }

  /**
 * Ürün için mevcut abonelik planlarını getir
 */
  @Get(':slug/subscription-plans')
  async getProductSubscriptionPlans(@Param('slug') slug: string): Promise<SubscriptionPlan[]> {
    const product = await this.getProductBySlug(slug);

    // ⚡ Railway optimizasyonu: Cache aktif planları
    const allPlans = await this.subscriptionPlansService.findAll(true);

    // Ürün kodu ile eşleşen planları filtrele
    const matchingPlans = allPlans.filter(plan => {
      if (!plan.code || !product.productCode) return false;

      const planCodePrefix = plan.code.split('/')[0];
      return planCodePrefix === product.productCode;
    });

    return matchingPlans;
  }

  /**
   * ⚡ RAILWAY OPTIMIZED - Popüler ürünler (view count'a göre)
   * DB level sorting ile optimize edildi
   */
  @Get('featured/popular')
  async getPopularProducts(@Query('limit') limit?: string): Promise<Product[]> {
    const limitNum = Math.min(parseInt(limit) || 6, 20); // Max 20 limit

    console.log('🔥 PUBLIC_PRODUCTS - getPopularProducts:', limitNum);

    try {
      // ⚡ Railway optimizasyonu: DB level sorting
      const result = await this.productsService.findAllPaginated({
        isActive: true,
        limit: limitNum,
        offset: 0,
        orderBy: 'viewCount',
        orderDirection: 'DESC'
      });

      console.log('✅ PUBLIC_PRODUCTS - Popular products:', result.products.length);
      return result.products;
    } catch (error) {
      console.error('❌ PUBLIC_PRODUCTS - Popular products hatası:', error);
      return [];
    }
  }

  /**
   * ⚡ RAILWAY OPTIMIZED - Yeni ürünler (createdAt'e göre)
   * DB level sorting ile optimize edildi
   */
  @Get('featured/latest')
  async getLatestProducts(@Query('limit') limit?: string): Promise<Product[]> {
    const limitNum = Math.min(parseInt(limit) || 6, 20); // Max 20 limit

    console.log('🆕 PUBLIC_PRODUCTS - getLatestProducts:', limitNum);

    try {
      // ⚡ Railway optimizasyonu: DB level sorting
      const result = await this.productsService.findAllPaginated({
        isActive: true,
        limit: limitNum,
        offset: 0,
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      });

      console.log('✅ PUBLIC_PRODUCTS - Latest products:', result.products.length);
      return result.products;
    } catch (error) {
      console.error('❌ PUBLIC_PRODUCTS - Latest products hatası:', error);
      return [];
    }
  }

  /**
 * Ürün görüntülenme sayısını artır (view count)
 */
  @Post(':slug/view')
  @HttpCode(HttpStatus.OK)
  async incrementViewCount(@Param('slug') slug: string): Promise<{ success: boolean }> {
    try {
      console.log('👁️ PUBLIC_PRODUCTS - incrementViewCount:', slug);
      await this.productsService.incrementViewCount(slug);
      return { success: true };
    } catch (error) {
      console.error('❌ PUBLIC_PRODUCTS - View count hatası:', error);
      throw new NotFoundException('Ürün bulunamadı');
    }
  }
} 