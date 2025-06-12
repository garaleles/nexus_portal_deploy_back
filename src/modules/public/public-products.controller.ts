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
   * Aktif ürünleri listele (public)
   */
  @Get()
  async getActiveProducts(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<{ products: Product[], total: number }> {
    const filters = {
      isActive: true,
      search: search
    };

    const products = await this.productsService.findAll(filters);

    // Sayfalama
    const limitNum = limit ? parseInt(limit) : 12;
    const offsetNum = offset ? parseInt(offset) : 0;

    const paginatedProducts = products.slice(offsetNum, offsetNum + limitNum);

    return {
      products: paginatedProducts,
      total: products.length
    };
  }

  /**
   * Slug ile ürün getir (public)
   */
  @Get(':slug')
  async getProductBySlug(@Param('slug') slug: string): Promise<Product> {
    try {
      const product = await this.productsService.findBySlug(slug);

      if (!product.isActive) {
        throw new NotFoundException('Ürün bulunamadı veya aktif değil');
      }

      return product;
    } catch (error) {
      throw new NotFoundException('Ürün bulunamadı');
    }
  }

  /**
 * Ürün için mevcut abonelik planlarını getir
 */
  @Get(':slug/subscription-plans')
  async getProductSubscriptionPlans(@Param('slug') slug: string): Promise<SubscriptionPlan[]> {
    const product = await this.getProductBySlug(slug);

    // Tüm aktif planları al
    const allPlans = await this.subscriptionPlansService.findAll(true);

    // Ürün kodu ile eşleşen planları filtrele
    // Abonelik planı kodunun "/" karakterine kadar olan kısmını alıp ürün kodu ile karşılaştır
    const matchingPlans = allPlans.filter(plan => {
      if (!plan.code || !product.productCode) return false;

      const planCodePrefix = plan.code.split('/')[0];
      return planCodePrefix === product.productCode;
    });

    return matchingPlans;
  }

  /**
   * Popüler ürünler (view count'a göre)
   */
  @Get('featured/popular')
  async getPopularProducts(@Query('limit') limit?: string): Promise<Product[]> {
    const allProducts = await this.productsService.findAll({ isActive: true });

    const limitNum = limit ? parseInt(limit) : 6;

    return allProducts
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limitNum);
  }

  /**
   * Yeni ürünler (createdAt'e göre)
   */
  @Get('featured/latest')
  async getLatestProducts(@Query('limit') limit?: string): Promise<Product[]> {
    const allProducts = await this.productsService.findAll({ isActive: true });

    const limitNum = limit ? parseInt(limit) : 6;

    return allProducts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitNum);
  }

  /**
 * Ürün görüntülenme sayısını artır (view count)
 */
  @Post(':slug/view')
  @HttpCode(HttpStatus.OK)
  async incrementViewCount(@Param('slug') slug: string): Promise<{ success: boolean }> {
    try {
      await this.productsService.incrementViewCount(slug);
      return { success: true };
    } catch (error) {
      throw new NotFoundException('Ürün bulunamadı');
    }
  }
} 