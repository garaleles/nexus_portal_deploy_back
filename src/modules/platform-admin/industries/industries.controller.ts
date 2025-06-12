import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IndustriesService } from './industries.service';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';
import { Industry } from './entities/industry.entity';
import { KeycloakAuthGuard } from '../../../core/auth/guards/keycloak-auth.guard';
import { EnhancedRolesGuard } from '../../../core/auth/guards/enhanced-roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { PlatformUserRole } from '../platform-users/entities/platform-user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Sektör Yönetimi')
@Controller('platform-admin/industries')
@UseGuards(KeycloakAuthGuard, EnhancedRolesGuard)
@ApiBearerAuth()
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createIndustryDto: CreateIndustryDto): Promise<Industry> {
    return this.industriesService.create(createIndustryDto);
  }

  @Get()
  findAll(): Promise<Industry[]> {
    return this.industriesService.findAll();
  }

  @Get('active')
  findActive(): Promise<Industry[]> {
    return this.industriesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Industry> {
    return this.industriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIndustryDto: UpdateIndustryDto,
  ): Promise<Industry> {
    return this.industriesService.update(id, updateIndustryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.industriesService.remove(id);
  }
}
