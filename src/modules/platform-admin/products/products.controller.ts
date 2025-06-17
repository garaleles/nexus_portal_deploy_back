import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';

/**
 * Ürün yönetimi controller'ı
 * Platform yöneticilerinin ürünleri yönetmesini sağlar
 */
@ApiTags('Ürün Yönetimi')
@Controller('platform-admin/products')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  /**
   * Yeni ürün oluştur
   */
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 resim
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ): Promise<Product> {
    // Dosya tipi kontrolü
    if (files && files.length > 0) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));

      if (invalidFiles.length > 0) {
        throw new BadRequestException('Sadece JPEG, PNG ve WebP formatlarında resim yükleyebilirsiniz');
      }

      // Dosya boyutu kontrolü (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = files.filter(file => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        throw new BadRequestException('Resim dosyaları 5MB\'dan büyük olamaz');
      }
    }

    return this.productsService.create(createProductDto, files);
  }

  /**
   * Tüm ürünleri listele
   */
  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('subscriptionPlanId') subscriptionPlanId?: string,
    @Query('search') search?: string
  ): Promise<Product[]> {
    console.log('🚀 PRODUCTS CONTROLLER - findAll endpoint hit!');
    console.log('📝 PRODUCTS CONTROLLER - Query parameters:', {
      isActive,
      subscriptionPlanId,
      search
    });

    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (subscriptionPlanId) {
      filters.subscriptionPlanId = subscriptionPlanId;
    }

    if (search) {
      filters.search = search;
    }

    console.log('🔍 PRODUCTS CONTROLLER - Filters prepared:', filters);

    try {
      console.log('📡 PRODUCTS CONTROLLER - Calling service.findAll...');
      const products = await this.productsService.findAll(filters);

      console.log('✅ PRODUCTS CONTROLLER - Service response:', {
        count: products.length,
        firstProductPreview: products[0] ? {
          id: products[0].id,
          name: products[0].name,
          isActive: products[0].isActive
        } : 'No products'
      });

      return products;
    } catch (error) {
      console.error('❌ PRODUCTS CONTROLLER - Error in findAll:', error);
      throw error;
    }
  }

  /**
   * ID ile ürün getir
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  /**
   * Slug ile ürün getir (public endpoint)
   */
  @Get('public/slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Product> {
    return this.productsService.findBySlug(slug);
  }

  /**
   * Ürün güncelle
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * Ürün sil
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  /**
   * Ürüne resim ekle
   */
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<ProductImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('En az bir resim dosyası yüklemelisiniz');
    }

    // Dosya tipi kontrolü
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));

    if (invalidFiles.length > 0) {
      throw new BadRequestException('Sadece JPEG, PNG ve WebP formatlarında resim yükleyebilirsiniz');
    }

    // Dosya boyutu kontrolü (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      throw new BadRequestException('Resim dosyaları 5MB\'dan büyük olamaz');
    }

    return this.productsService.uploadProductImages(id, files);
  }

  /**
   * Ürün resmi sil
   */
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string
  ): Promise<void> {
    return this.productsService.removeProductImage(id, imageId);
  }

  /**
   * Ana resim belirle
   */
  @Patch(':id/images/:imageId/primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPrimaryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string
  ): Promise<void> {
    return this.productsService.setPrimaryImage(id, imageId);
  }

  @Get('debug/:id')
  @ApiOperation({ summary: 'Debug: Get product with subscription plan' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async debugProduct(@Param('id') id: string) {
    try {
      const product = await this.productsService.findOne(id);

      console.log('🔍 PRODUCT DEBUG:', {
        id: product.id,
        name: product.name,
        subscriptionPlanId: product.subscriptionPlanId,
        hasSubscriptionPlan: !!product.subscriptionPlan,
        subscriptionPlanName: product.subscriptionPlan?.name
      });

      return {
        success: true,
        message: 'Debug product retrieved successfully',
        data: product
      };
    } catch (error) {
      console.error('❌ PRODUCT DEBUG Error:', error);
      throw error;
    }
  }
} 