import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10, // Max 10 dosya
      },
    }),
    SubscriptionPlansModule,
    RolePermissionsModule
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService],
  exports: [ProductsService],
})
export class ProductsModule { } 