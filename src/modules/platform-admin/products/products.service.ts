import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto, CreateProductImageDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateProductImageDto } from './dto/update-product.dto';
import { CloudinaryService, CloudinaryResponse } from '../../../core/services/cloudinary.service';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    private cloudinaryService: CloudinaryService,
    private subscriptionPlansService: SubscriptionPlansService,
  ) { }

  /**
   * Yeni ürün oluşturur
   */
  async create(
    createProductDto: CreateProductDto,
    files?: Express.Multer.File[]
  ): Promise<Product> {
    // Slug oluşturma
    let slug = createProductDto.slug;
    if (!slug) {
      slug = slugify(createProductDto.name, { lower: true, strict: true });
    }

    // ProductCode kontrolü - benzersiz olmalı
    const existingProductWithCode = await this.productRepository.findOne({
      where: { productCode: createProductDto.productCode },
    });

    if (existingProductWithCode) {
      throw new ConflictException(`'${createProductDto.productCode}' kodu ile kayıtlı bir ürün zaten var`);
    }

    // Slug kontrolü - benzersiz olmalı
    const existingProductWithSlug = await this.productRepository.findOne({
      where: { slug },
    });

    if (existingProductWithSlug) {
      throw new ConflictException(`'${slug}' slug'i ile kayıtlı bir ürün zaten var`);
    }

    // Subscription plan kontrolü (optional)
    if (createProductDto.subscriptionPlanId) {
      const subscriptionPlan = await this.subscriptionPlansService.findOne(createProductDto.subscriptionPlanId);
      if (!subscriptionPlan) {
        throw new NotFoundException(`Abonelik planı bulunamadı: ${createProductDto.subscriptionPlanId}`);
      }
    }

    // Ürün oluştur
    const product = new Product();
    product.productCode = createProductDto.productCode;
    product.name = createProductDto.name;
    product.slug = slug;
    product.description = createProductDto.description;
    product.subscriptionPlanId = createProductDto.subscriptionPlanId || null;
    product.price = createProductDto.price || 0;
    product.isActive = createProductDto.isActive ?? true;
    product.metaTitle = createProductDto.metaTitle;
    product.metaDescription = createProductDto.metaDescription;
    product.tags = createProductDto.tags;
    product.createdBy = createProductDto.createdBy;

    // Ürünü kaydet
    const savedProduct = await this.productRepository.save(product);

    // Resimleri yükle
    if (files && files.length > 0) {
      await this.uploadProductImages(savedProduct.id, files);
    }

    // Güncellenmiş ürünü döndür (resimlerle birlikte)
    return this.findOne(savedProduct.id);
  }

  /**
   * Ürün resimlerini Cloudinary'e yükler ve veritabanına kaydeder
   */
  async uploadProductImages(
    productId: string,
    files: Express.Multer.File[],
    imageMetadata?: CreateProductImageDto[]
  ): Promise<ProductImage[]> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Ürün bulunamadı: ${productId}`);
    }

    try {
      // Cloudinary'e yükle
      const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
        files,
        `products/${product.slug}`
      );

      // Veritabanına kaydet
      const productImages: ProductImage[] = [];

      for (let i = 0; i < uploadResults.length; i++) {
        const uploadResult = uploadResults[i];
        const metadata = imageMetadata?.[i] || {};

        const productImage = new ProductImage();
        productImage.productId = productId;
        productImage.publicId = uploadResult.public_id;
        productImage.url = uploadResult.url;
        productImage.secureUrl = uploadResult.secure_url;
        productImage.width = uploadResult.width;
        productImage.height = uploadResult.height;
        productImage.format = uploadResult.format;
        productImage.bytes = uploadResult.bytes;
        productImage.altText = metadata.altText;
        productImage.sortOrder = metadata.sortOrder ?? i;
        productImage.isPrimary = metadata.isPrimary ?? (i === 0); // İlk resim primary

        const savedImage = await this.productImageRepository.save(productImage);
        productImages.push(savedImage);
      }

      this.logger.log(`${files.length} resim başarıyla yüklendi - Ürün: ${product.name}`);
      return productImages;

    } catch (error) {
      this.logger.error(`Ürün resimleri yüklenirken hata oluştu: ${product.name}`, error.message);
      throw new BadRequestException(`Resim yükleme hatası: ${error.message}`);
    }
  }

  /**
   * Tüm ürünleri listeler
   */
  async findAll(filters?: {
    isActive?: boolean;
    subscriptionPlanId?: string;
    search?: string;
  }): Promise<Product[]> {
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.subscriptionPlan', 'subscriptionPlan')
      .leftJoinAndSelect('product.images', 'images')
      .orderBy('images.sortOrder', 'ASC')
      .addOrderBy('product.createdAt', 'DESC');

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.subscriptionPlanId) {
      queryBuilder.andWhere('product.subscriptionPlanId = :subscriptionPlanId', {
        subscriptionPlanId: filters.subscriptionPlanId
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.productCode ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return queryBuilder.getMany();
  }

  /**
   * ID ile ürün bul (view count artırmaz)
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['subscriptionPlan', 'images'],
      order: {
        images: {
          sortOrder: 'ASC'
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Ürün bulunamadı: ${id}`);
    }

    return product;
  }

  /**
   * Slug ile ürün bul (view count artırmaz)
   */
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug, isActive: true },
      relations: ['subscriptionPlan', 'images'],
      order: {
        images: {
          sortOrder: 'ASC'
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Ürün bulunamadı: ${slug}`);
    }

    return product;
  }

  /**
   * Slug ile ürün bul ve view count artır
   */
  async findBySlugWithViewIncrement(slug: string): Promise<Product> {
    const product = await this.findBySlug(slug);

    // View count artır
    await this.productRepository.increment({ id: product.id }, 'viewCount', 1);

    return product;
  }

  /**
   * Sadece view count artır
   */
  async incrementViewCount(slug: string): Promise<Product> {
    const product = await this.findBySlug(slug);

    // View count artır
    await this.productRepository.increment({ id: product.id }, 'viewCount', 1);

    return product;
  }

  /**
   * Ürün güncelle
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // Slug güncellenmişse kontrol et
    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingProductWithSlug = await this.productRepository.findOne({
        where: { slug: updateProductDto.slug },
      });

      if (existingProductWithSlug && existingProductWithSlug.id !== id) {
        throw new ConflictException(`'${updateProductDto.slug}' slug'i ile kayıtlı başka bir ürün var`);
      }
    }

    // ProductCode güncellenmişse kontrol et
    if (updateProductDto.productCode && updateProductDto.productCode !== product.productCode) {
      const existingProductWithCode = await this.productRepository.findOne({
        where: { productCode: updateProductDto.productCode },
      });

      if (existingProductWithCode && existingProductWithCode.id !== id) {
        throw new ConflictException(`'${updateProductDto.productCode}' kodu ile kayıtlı başka bir ürün var`);
      }
    }

    // Subscription plan değişmişse kontrol et (optional)
    if (updateProductDto.subscriptionPlanId && updateProductDto.subscriptionPlanId !== product.subscriptionPlanId) {
      const subscriptionPlan = await this.subscriptionPlansService.findOne(updateProductDto.subscriptionPlanId);
      if (!subscriptionPlan) {
        throw new NotFoundException(`Abonelik planı bulunamadı: ${updateProductDto.subscriptionPlanId}`);
      }
    }

    // Güncelle
    await this.productRepository.update(id, updateProductDto);

    return this.findOne(id);
  }

  /**
   * Ürün sil
   */
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    // Önce resimleri Cloudinary'den sil
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(img => img.publicId);
      await this.cloudinaryService.deleteMultipleFiles(publicIds);
    }

    // Ürünü sil (CASCADE ile resimler de silinir)
    await this.productRepository.delete(id);

    this.logger.log(`Ürün silindi: ${product.name}`);
  }

  /**
   * Ürün resmi sil
   */
  async removeProductImage(productId: string, imageId: string): Promise<void> {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId }
    });

    if (!image) {
      throw new NotFoundException(`Resim bulunamadı: ${imageId}`);
    }

    // Cloudinary'den sil
    await this.cloudinaryService.deleteFile(image.publicId);

    // Veritabanından sil
    await this.productImageRepository.delete(imageId);

    this.logger.log(`Ürün resmi silindi: ${image.publicId}`);
  }

  /**
   * Ana resim değiştir
   */
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    // Önce tüm resimleri primary olmayan yap
    await this.productImageRepository.update(
      { productId },
      { isPrimary: false }
    );

    // Seçili resmi primary yap
    const result = await this.productImageRepository.update(
      { id: imageId, productId },
      { isPrimary: true }
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Resim bulunamadı: ${imageId}`);
    }

    this.logger.log(`Ana resim değiştirildi - Ürün: ${productId}, Resim: ${imageId}`);
  }
} 