import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyInfoService } from './company-info.service';
import { CreateCompanyInfoDto } from './dto/create-company-info.dto';
import { UpdateCompanyInfoDto } from './dto/update-company-info.dto';
import { CompanyInfo } from './entities/company-info.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Şirket Bilgileri')
@Controller('platform-admin/company-info')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@ApiBearerAuth()
export class CompanyInfoController {
  constructor(private readonly companyInfoService: CompanyInfoService) { }

  @Post()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCompanyInfoDto: CreateCompanyInfoDto): Promise<CompanyInfo> {
    return this.companyInfoService.create(createCompanyInfoDto);
  }

  @Get()
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findAll(): Promise<CompanyInfo[]> {
    return this.companyInfoService.findAll();
  }

  @Get('first')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findFirst(): Promise<CompanyInfo | null> {
    return this.companyInfoService.findFirst();
  }

  @Get(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN, PlatformUserRole.SUPPORT_AGENT)
  findOne(@Param('id') id: string): Promise<CompanyInfo> {
    return this.companyInfoService.findOne(id);
  }

  @Patch(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateCompanyInfoDto: UpdateCompanyInfoDto,
  ): Promise<CompanyInfo> {
    return this.companyInfoService.update(id, updateCompanyInfoDto);
  }

  @Put('create-or-update')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  createOrUpdate(
    @Body() companyInfoData: CreateCompanyInfoDto | UpdateCompanyInfoDto,
  ): Promise<CompanyInfo> {
    return this.companyInfoService.createOrUpdate(companyInfoData);
  }

  @Delete(':id')
  @Roles(PlatformUserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.companyInfoService.remove(id);
  }

  @Post('upload-logo/:type')
  @Roles(PlatformUserRole.SUPER_ADMIN, PlatformUserRole.PLATFORM_ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  @HttpCode(HttpStatus.OK)
  async uploadLogo(
    @Param('type') logoType: 'main' | 'invoice',
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string; message: string }> {
    if (!file) {
      throw new Error('Dosya yüklenmedi');
    }

    const result = await this.companyInfoService.uploadLogo(file, logoType);

    return {
      ...result,
      message: `${logoType === 'main' ? 'Ana logo' : 'Fatura logosu'} başarıyla yüklendi`,
    };
  }
} 