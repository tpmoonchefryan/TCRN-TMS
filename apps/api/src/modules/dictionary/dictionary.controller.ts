// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ErrorCodes,
  SUPPORTED_UI_LOCALES,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Request } from 'express';

import { getPrimaryAcceptLanguage } from '../../common/request-locale.util';
import { paginated, success } from '../../common/response.util';
import { DictionaryService } from './dictionary.service';

// =====================================================
// DTOs
// =====================================================

const DICTIONARY_NAME_EXAMPLE: LocalizedText = {
  en: 'Customer Status',
  zh_HANS: '客户状态',
  zh_HANT: '客戶狀態',
  ja: '顧客ステータス',
  ko: '고객 상태',
  fr: 'Statut client',
};

const DICTIONARY_DESCRIPTION_EXAMPLE: LocalizedText = {
  en: 'Customer status codes',
  zh_HANS: '客户状态代码',
  zh_HANT: '客戶狀態代碼',
  ja: '顧客ステータスコード',
  ko: '고객 상태 코드',
  fr: 'Codes de statut client',
};

const DICTIONARY_ITEM_NAME_EXAMPLE: LocalizedText = {
  en: 'Active',
  zh_HANS: '活跃',
  zh_HANT: '活躍',
  ja: 'アクティブ',
  ko: '활성',
  fr: 'Actif',
};

const DICTIONARY_ITEM_DESCRIPTION_EXAMPLE: LocalizedText = {
  en: 'Customer is active',
  zh_HANS: '客户处于活跃状态',
  zh_HANT: '客戶處於活躍狀態',
  ja: '顧客が有効な状態です',
  ko: '고객이 활성 상태입니다',
  fr: 'Le client est actif',
};

export class GetDictionaryQueryDto {
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

export class CreateDictionaryTypeDto {
  @ApiProperty({ description: 'Dictionary type code', example: 'CUSTOMER_STATUS', minLength: 2, maxLength: 64 })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    description: 'Localized dictionary type name keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: DICTIONARY_NAME_EXAMPLE,
  })
  @IsObject()
  name!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Localized dictionary type description keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: DICTIONARY_DESCRIPTION_EXAMPLE,
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

  @ApiPropertyOptional({ description: 'Extra metadata (JSON object)', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Sort order', example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateDictionaryTypeDto {
  @ApiPropertyOptional({
    description: 'Localized dictionary type name patch keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: 'Statut client' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized dictionary type description patch keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: 'Codes de statut client' },
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

  @ApiPropertyOptional({ description: 'Extra metadata (JSON object)', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Sort order', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsNumber()
  version!: number;
}

export class CreateDictionaryItemDto {
  @ApiProperty({ description: 'Item code', example: 'ACTIVE', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    description: 'Localized item name keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: DICTIONARY_ITEM_NAME_EXAMPLE,
  })
  @IsObject()
  name!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Localized item description keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: DICTIONARY_ITEM_DESCRIPTION_EXAMPLE,
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

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

export class UpdateDictionaryItemDto {
  @ApiPropertyOptional({
    description: 'Localized item name patch keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: 'Actif' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized item description patch keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: 'Le client est actif' },
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

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

export class DeactivateItemDto {
  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsNumber()
  version!: number;
}

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const DICTIONARY_TYPE_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', example: 'CUSTOMER_STATUS' },
    name: { type: 'string', example: 'Customer Status' },
    description: { type: 'string', nullable: true, example: 'Customer status codes' },
    count: { type: 'integer', example: 5 },
  },
  required: ['type', 'name', 'description', 'count'],
};

const LOCALIZED_TEXT_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
  properties: Object.fromEntries(
    SUPPORTED_UI_LOCALES.map((locale) => [locale, { type: 'string' }]),
  ),
  required: [...SUPPORTED_UI_LOCALES],
};

const DICTIONARY_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440500' },
    dictionaryCode: { type: 'string', example: 'CUSTOMER_STATUS' },
    code: { type: 'string', example: 'ACTIVE' },
    name: { ...LOCALIZED_TEXT_SCHEMA, example: DICTIONARY_ITEM_NAME_EXAMPLE },
    localizedName: { type: 'string', example: 'Active' },
    description: { ...LOCALIZED_TEXT_SCHEMA, example: DICTIONARY_ITEM_DESCRIPTION_EXAMPLE },
    localizedDescription: { type: 'string', example: 'Customer is active' },
    sortOrder: { type: 'integer', example: 0 },
    isActive: { type: 'boolean', example: true },
    extraData: { type: 'object', nullable: true, additionalProperties: true, example: { color: '#00FF00' } },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: ['id', 'dictionaryCode', 'code', 'name', 'localizedName', 'description', 'localizedDescription', 'sortOrder', 'isActive', 'extraData', 'createdAt', 'updatedAt', 'version'],
};

const DICTIONARY_TYPES_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: DICTIONARY_TYPE_SCHEMA,
  },
  [
    {
      type: 'CUSTOMER_STATUS',
      name: 'Customer Status',
      description: 'Customer status codes',
      count: 5,
    },
  ],
);

const DICTIONARY_ITEMS_SUCCESS_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: DICTIONARY_ITEM_SCHEMA },
    meta: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 50 },
            totalCount: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 1 },
            hasNext: { type: 'boolean', example: false },
            hasPrev: { type: 'boolean', example: false },
          },
          required: ['page', 'pageSize', 'totalCount', 'totalPages', 'hasNext', 'hasPrev'],
        },
      },
      required: ['pagination'],
    },
  },
  required: ['success', 'data', 'meta'],
  example: {
    success: true,
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440500',
        dictionaryCode: 'CUSTOMER_STATUS',
        code: 'ACTIVE',
        name: DICTIONARY_ITEM_NAME_EXAMPLE,
        localizedName: 'Active',
        description: DICTIONARY_ITEM_DESCRIPTION_EXAMPLE,
        localizedDescription: 'Customer is active',
        sortOrder: 0,
        isActive: true,
        extraData: { color: '#00FF00' },
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T09:00:00.000Z',
        version: 1,
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 50,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
};

const DICTIONARY_ITEM_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  DICTIONARY_ITEM_SCHEMA,
  {
    id: '550e8400-e29b-41d4-a716-446655440500',
    dictionaryCode: 'CUSTOMER_STATUS',
    code: 'ACTIVE',
    name: DICTIONARY_ITEM_NAME_EXAMPLE,
    localizedName: 'Active',
    description: DICTIONARY_ITEM_DESCRIPTION_EXAMPLE,
    localizedDescription: 'Customer is active',
    sortOrder: 0,
    isActive: true,
    extraData: { color: '#00FF00' },
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const DICTIONARY_TYPE_MUTATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440510' },
      code: { type: 'string', example: 'CUSTOMER_STATUS' },
      name: { ...LOCALIZED_TEXT_SCHEMA, example: DICTIONARY_NAME_EXAMPLE },
      localizedName: { type: 'string', example: 'Customer Status' },
      description: { ...LOCALIZED_TEXT_SCHEMA, example: DICTIONARY_DESCRIPTION_EXAMPLE },
      localizedDescription: { type: 'string', example: 'Customer status codes' },
      extraData: { type: 'object', nullable: true, additionalProperties: true, example: { family: 'customer' } },
      sortOrder: { type: 'integer', example: 0 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
      version: { type: 'integer', example: 1 },
    },
    required: ['id', 'code', 'name', 'localizedName', 'description', 'localizedDescription', 'sortOrder', 'isActive', 'createdAt', 'updatedAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440510',
    code: 'CUSTOMER_STATUS',
    name: DICTIONARY_NAME_EXAMPLE,
    localizedName: 'Customer Status',
    description: DICTIONARY_DESCRIPTION_EXAMPLE,
    localizedDescription: 'Customer status codes',
    extraData: { family: 'customer' },
    sortOrder: 0,
    isActive: true,
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const DICTIONARY_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified. Please refresh and try again.',
);

const DICTIONARY_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const DICTIONARY_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Only AC tenant administrators can access this resource',
);

const DICTIONARY_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Dictionary resource not found',
);

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
  @ApiResponse({
    status: 200,
    description: 'Returns dictionary types with localized labels',
    schema: DICTIONARY_TYPES_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list dictionary types',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
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
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated dictionary items for the requested type',
    schema: DICTIONARY_ITEMS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read dictionary items',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary type was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
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
        code: ErrorCodes.RES_NOT_FOUND,
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
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiParam({
    name: 'code',
    description: 'Dictionary item code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a single dictionary item',
    schema: DICTIONARY_ITEM_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read dictionary item detail',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary item was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
  async getItem(
    @Param('type') type: string,
    @Param('code') code: string,
    @Req() req: Request,
  ) {
    const language = this.getLanguage(req);
    const item = await this.dictionaryService.getItem(type, code, language);

    if (!item) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
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
  @ApiResponse({
    status: 201,
    description: 'Creates a dictionary type',
    schema: DICTIONARY_TYPE_MUTATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary type payload is invalid or conflicts with an existing code/version constraint',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create dictionary types',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can create dictionary types',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  async createType(
    @Body() body: CreateDictionaryTypeDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    const result = await this.dictionaryService.createType(body);
    return success(result);
  }

  /**
   * PATCH /api/v1/system-dictionary/:type
   * Update a dictionary type (AC only)
   */
  @Patch(':type')
  @ApiOperation({ summary: 'Update dictionary type (AC only)' })
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated dictionary type',
    schema: DICTIONARY_TYPE_MUTATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary type update is invalid or version-mismatched',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update dictionary types',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can update dictionary types',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary type was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
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
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 201,
    description: 'Creates a dictionary item',
    schema: DICTIONARY_ITEM_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary item payload is invalid or conflicts with an existing code/version constraint',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create dictionary items',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can create dictionary items',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary type was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
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
   * PATCH /api/v1/system-dictionary/:type/items/:itemId
   * Update a dictionary item (AC only)
   */
  @Patch(':type/items/:itemId')
  @ApiOperation({ summary: 'Update dictionary item (AC only)' })
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiParam({
    name: 'itemId',
    description: 'Dictionary item identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated dictionary item',
    schema: DICTIONARY_ITEM_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary item update is invalid or version-mismatched',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update dictionary items',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can update dictionary items',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary item was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
  async updateItem(
    @Param('type') type: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateDictionaryItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);
    
    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(itemId);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.updateItem(itemId, body);
    return success(result);
  }

  /**
   * DELETE /api/v1/system-dictionary/:type/items/:itemId
   * Deactivate a dictionary item (AC only)
   */
  @Delete(':type/items/:itemId')
  @ApiOperation({ summary: 'Deactivate dictionary item (AC only)' })
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiParam({
    name: 'itemId',
    description: 'Dictionary item identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deactivates a dictionary item',
    schema: DICTIONARY_ITEM_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary item deactivation is invalid or version-mismatched',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate dictionary items',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can deactivate dictionary items',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary item was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
  async deactivateItem(
    @Param('type') type: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: DeactivateItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);

    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(itemId);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.deactivateItem(itemId, body.version);
    return success(result);
  }

  /**
   * POST /api/v1/system-dictionary/:type/items/:itemId/reactivate
   * Reactivate a dictionary item (AC only)
   */
  @Post(':type/items/:itemId/reactivate')
  @ApiOperation({ summary: 'Reactivate dictionary item (AC only)' })
  @ApiParam({
    name: 'type',
    description: 'Dictionary type code',
    schema: { type: 'string' },
  })
  @ApiParam({
    name: 'itemId',
    description: 'Dictionary item identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Reactivates a dictionary item',
    schema: DICTIONARY_ITEM_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Dictionary item reactivation is invalid or version-mismatched',
    schema: DICTIONARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reactivate dictionary items',
    schema: DICTIONARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can reactivate dictionary items',
    schema: DICTIONARY_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Dictionary item was not found',
    schema: DICTIONARY_NOT_FOUND_SCHEMA,
  })
  async reactivateItem(
    @Param('type') type: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: DeactivateItemDto,
    @Req() req: Request,
  ) {
    this.ensureAcTenant(req);

    // Verify item belongs to this type
    const item = await this.dictionaryService.getItemById(itemId);
    if (!item || item.dictionaryCode !== type) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Dictionary item not found`,
      });
    }

    const result = await this.dictionaryService.reactivateItem(itemId, body.version);
    return success(result);
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private getLanguage(req: Request): string {
    return getPrimaryAcceptLanguage(req);
  }

  private ensureAcTenant(req: Request): void {
    if (req.tenantContext?.tier !== 'ac') {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Only AC tenant administrators can access this resource',
      });
    }
  }
}
