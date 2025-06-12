import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryResponse {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Cloudinary yapılandırması
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('Cloudinary yapılandırması tamamlandı');
  }

  /**
   * Tek dosya yükleme
   */
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    publicId?: string
  ): Promise<CloudinaryResponse> {
    try {
      const uploadOptions: any = {
        resource_type: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto'
      };

      if (folder) {
        uploadOptions.folder = folder;
      }

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) {
              this.logger.error('Cloudinary upload hatası:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(file.buffer);
      });

      this.logger.log(`Dosya başarıyla yüklendi: ${result.public_id}`);

      return {
        public_id: result.public_id,
        url: result.url,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes
      };

    } catch (error) {
      this.logger.error('Cloudinary dosya yükleme hatası:', error.message);
      throw new BadRequestException(`Dosya yükleme hatası: ${error.message}`);
    }
  }

  /**
   * Çoklu dosya yükleme
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder?: string
  ): Promise<CloudinaryResponse[]> {
    const uploadPromises = files.map((file, index) => {
      const publicId = folder ? `${folder}_${Date.now()}_${index}` : undefined;
      return this.uploadFile(file, folder, publicId);
    });

    try {
      const results = await Promise.all(uploadPromises);
      this.logger.log(`${files.length} dosya başarıyla yüklendi`);
      return results;
    } catch (error) {
      this.logger.error('Çoklu dosya yükleme hatası:', error.message);
      throw new BadRequestException(`Çoklu dosya yükleme hatası: ${error.message}`);
    }
  }

  /**
   * Dosya silme
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        this.logger.log(`Dosya başarıyla silindi: ${publicId}`);
        return true;
      } else {
        this.logger.warn(`Dosya silinemedi: ${publicId}, sonuç: ${result.result}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Cloudinary dosya silme hatası:', error.message);
      throw new BadRequestException(`Dosya silme hatası: ${error.message}`);
    }
  }

  /**
   * Çoklu dosya silme
   */
  async deleteMultipleFiles(publicIds: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const publicId of publicIds) {
      try {
        const deleted = await this.deleteFile(publicId);
        if (deleted) {
          results.success.push(publicId);
        } else {
          results.failed.push(publicId);
        }
      } catch (error) {
        results.failed.push(publicId);
      }
    }

    this.logger.log(`Dosya silme sonucu - Başarılı: ${results.success.length}, Başarısız: ${results.failed.length}`);
    return results;
  }

  /**
   * Resim optimizasyonu için URL dönüşümü
   */
  getOptimizedImageUrl(publicId: string, width?: number, height?: number, quality?: string): string {
    const transformations: string[] = [];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);

    const transformation = transformations.length > 0 ? `${transformations.join(',')}/` : '';

    return `https://res.cloudinary.com/${this.configService.get('CLOUDINARY_CLOUD_NAME')}/image/upload/${transformation}${publicId}`;
  }
} 