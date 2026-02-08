// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Request } from 'express';

import { paginated, success } from '../../common/response.util';
import { DictionaryService } from './dictionary.service';

// =====================================================
// DTOs
// =====================================================

class GetDictionaryQueryDto {
  @ApiPropertyOptional({ description: 'Search keyword', example: 'status' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include inactive items', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 50, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}

class CreateDictionaryTypeDto {
  @ApiProperty({ description: 'Dictionary type code', example: 'CUSTOMER_STATUS', minLength: 2, maxLength: 64 })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Name in English', example: 'Customer Status', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '客户状态', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: '顧客ステータス', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Customer status codes' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '客户状态代码' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '顧客ステータスコード' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

class UpdateDictionaryTypeDto {
  @ApiPropertyOptional({ description: 'Name in English', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsNumber()
  version!: number;
}

class CreateDictionaryItemDto {
  @ApiProperty({ description: 'Item code', example: 'ACTIVE', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Name in English', example: 'Active', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '活跃', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'アクティブ', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Extra data (JSON object)', example: { color: '#00FF00' } })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}

class UpdateDictionaryItemDto {
  @ApiPropertyOptional({ description: 'Name in English', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Extra data (JSON object)' })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsNumber()
  version!: number;
}

class DeactivateItemDto {
  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsNumber()
  version!: number;
}

// =====================================================
// Controller
// =====================================================

/**
 * Dictionary Controller
 * Read access for all tenants, write access for AC tenant only
 * Route: /api/v1/system-dictionary/:type
 */
@ApiTags('System - Dictionary')
@Controller('system-dictionary')
@ApiBearerAuth()
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  // =====================================================
  // Read Operations (All Tenants)
  // =====================================================

  /**
   * GET /api/v1/system-dictionary
   * Get all dictionary types
   */
  @Get()
  @ApiOperation({ summary: 'List dictionary types' })
  async listTypes(@Req() req: Request) {
    const language = this.getLanguage(req);
    const types = await this.dictionaryService.getTypes(language);
    return success(types);
  }

  /**
   * GET /api/v1/system-dictionary/:type
   * Get dictionary items by type
   */
  @Get(':type')
  @ApiOperation({ summary: 'Get dictionary items' })
  async getByType(
    @Param('type') type: string,
    @Query() query: GetDictionaryQueryDto,
    @Req() req: Request,
  ) {
    const language = this.getLanguage(req);
    const isAc = req.tenantContext?.tier === 'ac';

    const result = await this.dictionaryService.getByType(type, {
      search: query.search,
      language,
      includeInactive: isAc ? query.includeInactive : false,
      page: query.page,
      pageSize: query.pageSize,
    });

    if (!result) {
      throw new NotFoundException({
        code: 'DICTIONARY_NOT_FOUND',
        message: `Dictionary type '${type}' not found`,
      });
    }

    return paginated(result.data, {
      page: query.page || 1,
      pageSize: query.pageSize || 500,
      totalCount: result.total,
    });
  }

  /**
   * GET /api/v1/system-dictionary/:type/:code
   * Get single dictionary item
   */
  @Get(':type/:code')
  @ApiOperation({ summary: 'Get dictionary item' })
  async getItem(
    @Param('type') type: string,
    @Param('code') code: string,
    @Req() req: Request,
  ) {
    const language = this.getLanguage(req);
    const item = await this.dictionaryService.getItem(type, code, language);

    if (!item) {
      throw new NotFoundException({
        code: 'DICTIONARY_ITEM_NOT_FOUND',
        message: `Dictionary item '${code}' not found in '${type}'`,
      });
    }

    return success(item);
  }

  // =====================================================
  // Write Operations (AC Tenant Only)
  // =====================================================

  /**
   * POST /api/v1/system-dictionary
   * Create a new dictionary type (AC only)
   */
  @Post()
  @ApiOperation({ summary: 'Create dictionary type (AC only)' })
  async createType(
    @Body() body: CreateDictionaryTypeDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    const result = await this.dictionaryService.createType(body);
    return success(result);
  }

  /**
   * PUT /api/v1/system-dictionary/:type
   * Update a dictionary type (AC only)
   */
  @Put(':type')
  @ApiOperation({ summary: 'Update dictionary type (AC only)' })
  async updateType(
    @Param('type') type: string,
    @Body() body: UpdateDictionaryTypeDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    const result = await this.dictionaryService.updateType(type, body);
    return success(result);
  }

  /**
   * POST /api/v1/system-dictionary/:type/items
   * Create a new dictionary item (AC only)
   */
  @Post(':type/items')
  @ApiOperation({ summary: 'Create dictionary item (AC only)' })
  async createItem(
    @Param('type') type: string,
    @Body() body: CreateDictionaryItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    const result = await this.dictionaryService.createItem(type, body);
    return success(result);
  }

  /**
   * PUT /api/v1/system-dictionary/:type/items/:id
   * Update a dictionary item (AC only)
   */
  @Put(':type/items/:id')
  @ApiOperation({ summary: 'Update dictionary item (AC only)' })
  async updateItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: UpdateDictionaryItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    
    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(id);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: 'DICTIONARY_ITEM_NOT_FOUND',
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.updateItem(id, body);
    return success(result);
  }

  /**
   * DELETE /api/v1/system-dictionary/:type/items/:id
   * Deactivate a dictionary item (AC only)
   */
  @Delete(':type/items/:id')
  @ApiOperation({ summary: 'Deactivate dictionary item (AC only)' })
  async deactivateItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: DeactivateItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);

    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(id);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: 'DICTIONARY_ITEM_NOT_FOUND',
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.deactivateItem(id, body.version);
    return success(result);
  }

  /**
   * POST /api/v1/system-dictionary/:type/items/:id/reactivate
   * Reactivate a dictionary item (AC only)
   */
  @Post(':type/items/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate dictionary item (AC only)' })
  async reactivateItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: DeactivateItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);

    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(id);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: 'DICTIONARY_ITEM_NOT_FOUND',
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.reactivateItem(id, body.version);
    return success(result);
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private getLanguage(req: Request): string {
    return (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';
  }

  private ensureAcTenant(req: Request): void {
    if (req.tenantContext?.tier !== 'ac') {
      throw new ForbiddenException({
        code: 'AC_ONLY_OPERATION',
        message: 'This operation is only available for AC tenant',
      });
    }
  }
}
