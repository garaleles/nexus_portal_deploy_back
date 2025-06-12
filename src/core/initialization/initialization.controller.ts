import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { InitializationService } from './initialization.service';

@Controller('admin/initialization')
@UseGuards(KeycloakAuthGuard)
export class InitializationController {
  private readonly logger = new Logger(InitializationController.name);

  constructor(private readonly initializationService: InitializationService) { }

  @Post('reinitialize')
  async reinitialize() {
    this.logger.log('Manual re-initialization başlatıldı');

    try {
      await this.initializationService.reinitialize();
      return {
        success: true,
        message: 'Portal re-initialization başarıyla tamamlandı'
      };
    } catch (error) {
      this.logger.error('Manual re-initialization hatası:', error.message);
      return {
        success: false,
        message: 'Portal re-initialization başarısız',
        error: error.message
      };
    }
  }

  @Post('roles/reinitialize')
  async reinitializeRoles() {
    this.logger.log('Manual roles re-initialization başlatıldı');

    try {
      await this.initializationService.reinitializeRoles();
      return {
        success: true,
        message: 'Roller başarıyla yeniden oluşturuldu'
      };
    } catch (error) {
      this.logger.error('Manual roles re-initialization hatası:', error.message);
      return {
        success: false,
        message: 'Rol yeniden oluşturma başarısız',
        error: error.message
      };
    }
  }

  @Post('client-mappers/reinitialize')
  async reinitializeClientMappers() {
    this.logger.log('Manual client mappers re-initialization başlatıldı');

    try {
      await this.initializationService.reinitializeClientMappers();
      return {
        success: true,
        message: 'JWT token mappers başarıyla yeniden oluşturuldu'
      };
    } catch (error) {
      this.logger.error('Manual client mappers re-initialization hatası:', error.message);
      return {
        success: false,
        message: 'JWT token mappers yeniden oluşturma başarısız',
        error: error.message
      };
    }
  }

  @Post('endpoints/reinitialize')
  async reinitializeEndpoints() {
    this.logger.log('Manual endpoints re-initialization başlatıldı');

    try {
      await this.initializationService.reinitializeEndpoints();
      return {
        success: true,
        message: 'Endpoint\'ler başarıyla yeniden oluşturuldu'
      };
    } catch (error) {
      this.logger.error('Manual endpoints re-initialization hatası:', error.message);
      return {
        success: false,
        message: 'Endpoint yeniden oluşturma başarısız',
        error: error.message
      };
    }
  }

  @Post('role-permissions/reinitialize')
  async reinitializeRolePermissions() {
    this.logger.log('Manual role permissions re-initialization başlatıldı');

    try {
      await this.initializationService.reinitializeRolePermissions();
      return {
        success: true,
        message: 'Rol izinleri başarıyla yeniden oluşturuldu'
      };
    } catch (error) {
      this.logger.error('Manual role permissions re-initialization hatası:', error.message);
      return {
        success: false,
        message: 'Rol izinleri yeniden oluşturma başarısız',
        error: error.message
      };
    }
  }
} 