// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { buildManagedNameTranslations } from '../../platform/persistence/managed-name-translations';
import { SubsidiaryService } from './subsidiary.service';

// DTOs
export class CreateSubsidiaryDto {
  @ApiPropertyOptional({
    description: 'Parent subsidiary identifier. Omit for a root-level subsidiary.',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiProperty({
    description: 'Subsidiary code',
    example: 'TOKYO',
    pattern: '^[A-Z0-9_]{3,32}$',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @ApiProperty({ description: 'Subsidiary name in English', example: 'Tokyo Branch', minLength: 1 })
  @IsString()
  @MinLength(1)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Subsidiary name in Chinese', example: '东京分部' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Subsidiary name in Japanese', example: '東京支社' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed locale map keyed by supported locale codes',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: '東京分部',
      ko: '도쿄 지사',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Main branch for JP operations' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '日本业务主分部' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '日本事業の主要拠点' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSubsidiaryDto {
  @ApiPropertyOptional({ description: 'Subsidiary name in English', example: 'Tokyo Branch' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Subsidiary name in Chinese', example: '东京分部' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Subsidiary name in Japanese', example: '東京支社' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed locale map keyed by supported locale codes',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: '東京分部',
      ko: '도쿄 지사',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Main branch for JP operations' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '日本业务主分部' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '日本事業の主要拠点' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 10, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class MoveSubsidiaryDto {
  @ApiPropertyOptional({
    description: 'New parent subsidiary identifier. Structural move remains retired from normal product flow.',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440101',
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class DeactivateSubsidiaryDto {
  @ApiPropertyOptional({
    description: 'Whether to cascade the deactivate action to descendant subsidiaries and talents',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cascade?: boolean;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class ReactivateSubsidiaryDto {
  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class ListSubsidiariesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Filter by parent subsidiary identifier. Use `null` to fetch root-level subsidiaries.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Search by subsidiary code or localized name', example: 'Tokyo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort expression', example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
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

const SUBSIDIARY_BASE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    parentId: { type: 'string', format: 'uuid', nullable: true, example: null },
    code: { type: 'string', example: 'TOKYO' },
    path: { type: 'string', example: '/TOKYO/' },
    depth: { type: 'integer', example: 1 },
    nameEn: { type: 'string', example: 'Tokyo Branch' },
    nameZh: { type: 'string', nullable: true, example: '东京分部' },
    nameJa: { type: 'string', nullable: true, example: '東京支社' },
    name: { type: 'string', example: 'Tokyo Branch' },
    descriptionEn: { type: 'string', nullable: true, example: 'Main branch for JP operations' },
    descriptionZh: { type: 'string', nullable: true, example: '日本业务主分部' },
    descriptionJa: { type: 'string', nullable: true, example: '日本事業の主要拠点' },
    sortOrder: { type: 'integer', example: 0 },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: [
    'id',
    'parentId',
    'code',
    'path',
    'depth',
    'nameEn',
    'name',
    'sortOrder',
    'isActive',
    'createdAt',
    'updatedAt',
    'version',
  ],
};

const SUBSIDIARY_LIST_ITEM_SCHEMA = {
  ...SUBSIDIARY_BASE_SCHEMA,
  properties: {
    ...SUBSIDIARY_BASE_SCHEMA.properties,
    childrenCount: { type: 'integer', example: 2 },
    talentCount: { type: 'integer', example: 5 },
  },
  required: [...(SUBSIDIARY_BASE_SCHEMA.required as string[]), 'childrenCount', 'talentCount'],
};

const SUBSIDIARY_PAGINATED_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'array',
      items: SUBSIDIARY_LIST_ITEM_SCHEMA,
    },
    meta: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
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
        id: '550e8400-e29b-41d4-a716-446655440100',
        parentId: null,
        code: 'TOKYO',
        path: '/TOKYO/',
        depth: 1,
        nameEn: 'Tokyo Branch',
        nameZh: '东京分部',
        nameJa: '東京支社',
        name: 'Tokyo Branch',
        descriptionEn: 'Main branch for JP operations',
        descriptionZh: '日本业务主分部',
        descriptionJa: '日本事業の主要拠点',
        sortOrder: 0,
        isActive: true,
        childrenCount: 2,
        talentCount: 5,
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T09:00:00.000Z',
        version: 1,
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
};

const SUBSIDIARY_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  SUBSIDIARY_LIST_ITEM_SCHEMA,
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    parentId: null,
    code: 'TOKYO',
    path: '/TOKYO/',
    depth: 1,
    nameEn: 'Tokyo Branch',
    nameZh: '东京分部',
    nameJa: '東京支社',
    name: 'Tokyo Branch',
    descriptionEn: 'Main branch for JP operations',
    descriptionZh: '日本业务主分部',
    descriptionJa: '日本事業の主要拠点',
    sortOrder: 0,
    isActive: true,
    childrenCount: 2,
    talentCount: 5,
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const SUBSIDIARY_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
      parentId: { type: 'string', format: 'uuid', nullable: true, example: null },
      code: { type: 'string', example: 'TOKYO' },
      path: { type: 'string', example: '/TOKYO/' },
      depth: { type: 'integer', example: 1 },
      nameEn: { type: 'string', example: 'Tokyo Branch' },
      nameZh: { type: 'string', nullable: true, example: '东京分部' },
      nameJa: { type: 'string', nullable: true, example: '東京支社' },
      name: { type: 'string', example: 'Tokyo Branch' },
      sortOrder: { type: 'integer', example: 0 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
      version: { type: 'integer', example: 1 },
    },
    required: [
      'id',
      'parentId',
      'code',
      'path',
      'depth',
      'nameEn',
      'name',
      'sortOrder',
      'isActive',
      'createdAt',
      'version',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    parentId: null,
    code: 'TOKYO',
    path: '/TOKYO/',
    depth: 1,
    nameEn: 'Tokyo Branch',
    nameZh: '东京分部',
    nameJa: '東京支社',
    name: 'Tokyo Branch',
    sortOrder: 0,
    isActive: true,
    createdAt: '2026-04-13T08:00:00.000Z',
    version: 1,
  },
);

const SUBSIDIARY_UPDATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
      nameEn: { type: 'string', example: 'Tokyo Branch' },
      nameZh: { type: 'string', nullable: true, example: '东京分部' },
      nameJa: { type: 'string', nullable: true, example: '東京支社' },
      name: { type: 'string', example: 'Tokyo Branch' },
      sortOrder: { type: 'integer', example: 10 },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:15:00.000Z' },
      version: { type: 'integer', example: 2 },
    },
    required: ['id', 'nameEn', 'name', 'sortOrder', 'updatedAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    nameEn: 'Tokyo Branch',
    nameZh: '东京分部',
    nameJa: '東京支社',
    name: 'Tokyo Branch',
    sortOrder: 10,
    updatedAt: '2026-04-13T09:15:00.000Z',
    version: 2,
  },
);

const SUBSIDIARY_MOVE_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_CONFLICT,
  'Subsidiary move has been retired from normal product flow. If structural correction is required, it must be performed via direct database intervention.',
);

const SUBSIDIARY_ACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
      isActive: { type: 'boolean', example: false },
      cascadeAffected: {
        type: 'object',
        properties: {
          subsidiaries: { type: 'integer', example: 1 },
          talents: { type: 'integer', example: 2 },
        },
        required: ['subsidiaries', 'talents'],
      },
    },
    required: ['id', 'isActive'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    isActive: false,
    cascadeAffected: {
      subsidiaries: 1,
      talents: 2,
    },
  },
);

const SUBSIDIARY_REACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
      isActive: { type: 'boolean', example: true },
      version: { type: 'integer', example: 3 },
    },
    required: ['id', 'isActive', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    isActive: true,
    version: 3,
  },
);

const SUBSIDIARY_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified. Please refresh and try again.',
);

const SUBSIDIARY_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const SUBSIDIARY_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Subsidiary not found',
);

/**
 * Get localized name based on language
 */
function getLocalizedName(
  entity: { nameEn: string; nameZh: string | null; nameJa: string | null },
  language: string = 'en'
): string {
  switch (language) {
    case 'zh':
      return entity.nameZh || entity.nameEn;
    case 'ja':
      return entity.nameJa || entity.nameEn;
    default:
      return entity.nameEn;
  }
}

/**
 * Subsidiary Controller
 * Manages hierarchical organization units
 */
@ApiTags('Org - Subsidiaries')
@Controller('subsidiaries')
@ApiBearerAuth()
export class SubsidiaryController {
  constructor(private readonly subsidiaryService: SubsidiaryService) {}

  /**
   * GET /api/v1/subsidiaries
   * List subsidiaries
   */
  @Get()
  @ApiOperation({ summary: 'List subsidiaries' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated subsidiaries',
    schema: SUBSIDIARY_PAGINATED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list subsidiaries',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSubsidiariesQueryDto,
  ) {
    const { data, total } = await this.subsidiaryService.list(
      user.tenantSchema,
      {
        page: query.page,
        pageSize: query.pageSize,
        parentId: query.parentId === 'null' ? null : query.parentId,
        search: query.search,
        isActive: query.isActive,
        sort: query.sort,
      }
    );

    // Get additional counts
    const enrichedData = await Promise.all(
      data.map(async (sub) => {
        const [childrenCount, talentCount] = await Promise.all([
          this.subsidiaryService.getChildrenCount(sub.id, user.tenantSchema),
          this.subsidiaryService.getTalentCount(sub.id, user.tenantSchema),
        ]);
        const translations = buildManagedNameTranslations(sub);

        return {
          id: sub.id,
          parentId: sub.parentId,
          code: sub.code,
          path: sub.path,
          depth: sub.depth,
          nameEn: sub.nameEn,
          nameZh: sub.nameZh,
          nameJa: sub.nameJa,
          translations,
          name: translations.en || getLocalizedName(sub),
          descriptionEn: sub.descriptionEn,
          descriptionZh: sub.descriptionZh,
          descriptionJa: sub.descriptionJa,
          sortOrder: sub.sortOrder,
          isActive: sub.isActive,
          childrenCount,
          talentCount,
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
          version: sub.version,
        };
      })
    );

    return paginated(enrichedData, {
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalCount: total,
    });
  }

  /**
   * POST /api/v1/subsidiaries
   * Create subsidiary
   */
  @Post()
  @ApiOperation({ summary: 'Create subsidiary' })
  @ApiResponse({
    status: 201,
    description: 'Creates a subsidiary',
    schema: SUBSIDIARY_CREATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Subsidiary payload is invalid or conflicts with an existing code/version constraint',
    schema: SUBSIDIARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create subsidiaries',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Parent subsidiary was not found',
    schema: SUBSIDIARY_NOT_FOUND_SCHEMA,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubsidiaryDto,
  ) {
    const subsidiary = await this.subsidiaryService.create(
      user.tenantSchema,
      {
        parentId: dto.parentId,
        code: dto.code,
        nameEn: dto.nameEn,
        nameZh: dto.nameZh,
        nameJa: dto.nameJa,
        translations: dto.translations,
        descriptionEn: dto.descriptionEn,
        descriptionZh: dto.descriptionZh,
        descriptionJa: dto.descriptionJa,
        sortOrder: dto.sortOrder,
      },
      user.id
    );

    const translations = buildManagedNameTranslations(subsidiary);

    return success({
      id: subsidiary.id,
      parentId: subsidiary.parentId,
      code: subsidiary.code,
      path: subsidiary.path,
      depth: subsidiary.depth,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      translations,
      name: translations.en || getLocalizedName(subsidiary),
      sortOrder: subsidiary.sortOrder,
      isActive: subsidiary.isActive,
      createdAt: subsidiary.createdAt.toISOString(),
      version: subsidiary.version,
    });
  }

  /**
   * GET /api/v1/subsidiaries/:subsidiaryId
   * Get subsidiary details
   */
  @Get(':subsidiaryId')
  @ApiOperation({ summary: 'Get subsidiary details' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns subsidiary detail',
    schema: SUBSIDIARY_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read subsidiary detail',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found',
    schema: SUBSIDIARY_NOT_FOUND_SCHEMA,
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
  ) {
    const subsidiary = await this.subsidiaryService.findById(subsidiaryId, user.tenantSchema);
    if (!subsidiary) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    const [childrenCount, talentCount] = await Promise.all([
      this.subsidiaryService.getChildrenCount(subsidiaryId, user.tenantSchema),
      this.subsidiaryService.getTalentCount(subsidiaryId, user.tenantSchema),
    ]);

    const translations = buildManagedNameTranslations(subsidiary);

    return success({
      id: subsidiary.id,
      parentId: subsidiary.parentId,
      code: subsidiary.code,
      path: subsidiary.path,
      depth: subsidiary.depth,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      translations,
      name: translations.en || getLocalizedName(subsidiary),
      descriptionEn: subsidiary.descriptionEn,
      descriptionZh: subsidiary.descriptionZh,
      descriptionJa: subsidiary.descriptionJa,
      sortOrder: subsidiary.sortOrder,
      isActive: subsidiary.isActive,
      childrenCount,
      talentCount,
      createdAt: subsidiary.createdAt.toISOString(),
      updatedAt: subsidiary.updatedAt.toISOString(),
      version: subsidiary.version,
    });
  }

  /**
   * PATCH /api/v1/subsidiaries/:subsidiaryId
   * Update subsidiary
   */
  @Patch(':subsidiaryId')
  @ApiOperation({ summary: 'Update subsidiary' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated subsidiary',
    schema: SUBSIDIARY_UPDATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Subsidiary update payload is invalid or version-mismatched',
    schema: SUBSIDIARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update subsidiaries',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found',
    schema: SUBSIDIARY_NOT_FOUND_SCHEMA,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: UpdateSubsidiaryDto,
  ) {
    const subsidiary = await this.subsidiaryService.update(
      subsidiaryId,
      user.tenantSchema,
      dto,
      user.id
    );

    const translations = buildManagedNameTranslations(subsidiary);

    return success({
      id: subsidiary.id,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      translations,
      name: translations.en || getLocalizedName(subsidiary),
      sortOrder: subsidiary.sortOrder,
      updatedAt: subsidiary.updatedAt.toISOString(),
      version: subsidiary.version,
    });
  }

  /**
   * POST /api/v1/subsidiaries/:subsidiaryId/move
   * Retained only to fail closed; structural move is supported only by direct database intervention
   */
  @Post(':subsidiaryId/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move subsidiary (retired; direct database intervention only)' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to attempt subsidiary move',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Subsidiary move is retired from normal product flow',
    schema: SUBSIDIARY_MOVE_CONFLICT_SCHEMA,
  })
  async move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: MoveSubsidiaryDto,
  ) {
    const result = await this.subsidiaryService.move(
      subsidiaryId,
      user.tenantSchema,
      dto.newParentId ?? null,
      dto.version,
      user.id
    );

    return success({
      id: result.subsidiary.id,
      parentId: result.subsidiary.parentId,
      path: result.subsidiary.path,
      depth: result.subsidiary.depth,
      affectedChildren: result.affectedChildren,
      version: result.subsidiary.version,
    });
  }

  /**
   * POST /api/v1/subsidiaries/:subsidiaryId/deactivate
   * Deactivate subsidiary
   */
  @Post(':subsidiaryId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate subsidiary' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deactivates the subsidiary',
    schema: SUBSIDIARY_ACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Deactivate request is invalid or version-mismatched',
    schema: SUBSIDIARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate subsidiaries',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found',
    schema: SUBSIDIARY_NOT_FOUND_SCHEMA,
  })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: DeactivateSubsidiaryDto,
  ) {
    const result = await this.subsidiaryService.deactivate(
      subsidiaryId,
      user.tenantSchema,
      dto.cascade || false,
      dto.version,
      user.id
    );

    return success({
      id: subsidiaryId,
      isActive: false,
      cascadeAffected: {
        subsidiaries: result.subsidiaries,
        talents: result.talents,
      },
    });
  }

  /**
   * POST /api/v1/subsidiaries/:subsidiaryId/reactivate
   * Reactivate subsidiary
   */
  @Post(':subsidiaryId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate subsidiary' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Reactivates the subsidiary',
    schema: SUBSIDIARY_REACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Reactivate request is invalid or version-mismatched',
    schema: SUBSIDIARY_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reactivate subsidiaries',
    schema: SUBSIDIARY_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found',
    schema: SUBSIDIARY_NOT_FOUND_SCHEMA,
  })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() body: ReactivateSubsidiaryDto,
  ) {
    const subsidiary = await this.subsidiaryService.reactivate(
      subsidiaryId,
      user.tenantSchema,
      body.version,
      user.id
    );

    return success({
      id: subsidiary.id,
      isActive: true,
      version: subsidiary.version,
    });
  }
}
