// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { buildManagedNameTranslations } from '../../platform/persistence/managed-name-translations';
import { TalentService } from './talent.service';

// DTOs
export class CreateTalentDto {
  @ApiPropertyOptional({
    description: 'Owning subsidiary identifier. Omit for a tenant-root talent.',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsOptional()
  @IsString()
  subsidiaryId?: string | null;

  @ApiProperty({
    description: 'Profile store identifier used by this talent',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440200',
  })
  @IsUUID()
  profileStoreId: string;

  @ApiProperty({
    description: 'Talent code',
    example: 'SORA',
    pattern: '^[A-Z0-9_]{3,32}$',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @ApiProperty({ description: 'Talent name in English', example: 'Tokino Sora', minLength: 1 })
  @IsString()
  @MinLength(1)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Talent name in Chinese', example: '时乃空' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Talent name in Japanese', example: 'ときのそら' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed locale map keyed by supported locale codes',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: '時乃空',
      ko: '도키노 소라',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiProperty({ description: 'Primary display name shown in UI', example: 'Sora' })
  @IsString()
  @MinLength(1)
  displayName: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Main homepage profile' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主页简介' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: 'ホームページ用プロフィール' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://cdn.tcrn.app/avatar/sora.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Homepage path used by public homepage routing',
    example: 'sora',
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Homepage path must be lowercase letters, numbers, and hyphens only' })
  homepagePath?: string;

  @ApiPropertyOptional({ description: 'IANA timezone identifier', example: 'Asia/Tokyo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Talent feature settings payload',
    example: { homepageEnabled: true, marshmallowEnabled: true, inheritTimezone: false },
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateTalentDto {
  @ApiPropertyOptional({ description: 'Talent name in English', example: 'Tokino Sora' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Talent name in Chinese', example: '时乃空' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Talent name in Japanese', example: 'ときのそら' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed locale map keyed by supported locale codes',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: '時乃空',
      ko: '도키노 소라',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Primary display name shown in UI', example: 'Sora' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Main homepage profile' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主页简介' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: 'ホームページ用プロフィール' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://cdn.tcrn.app/avatar/sora.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Homepage path used by public homepage routing',
    example: 'sora',
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  homepagePath?: string;

  @ApiPropertyOptional({ description: 'IANA timezone identifier', example: 'Asia/Tokyo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Talent feature settings payload',
    example: { homepageEnabled: true, marshmallowEnabled: true, inheritTimezone: false },
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class MoveTalentDto {
  @ApiPropertyOptional({
    description: 'New subsidiary identifier. Structural move remains retired from normal product flow.',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440101',
  })
  @IsOptional()
  @IsString()
  newSubsidiaryId?: string | null;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class TalentLifecycleMutationDto {
  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class DeleteTalentQueryDto {
  @ApiProperty({
    description: 'Optimistic lock version required for hard delete',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;
}

export class ListTalentsQueryDto {
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
    description: 'Filter by owning subsidiary identifier. Use `null` for tenant-root talents.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsOptional()
  @IsString()
  subsidiaryId?: string;

  @ApiPropertyOptional({ description: 'Search by talent code, name, or display name', example: 'Sora' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active flag', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort expression', example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class SetCustomDomainDto {
  @ApiPropertyOptional({
    description: 'Custom domain to attach to this talent. Set `null` to clear the domain.',
    nullable: true,
    example: 'fans.example.com',
  })
  @IsOptional()
  @IsString()
  customDomain?: string | null;
}

export class UpdateCustomDomainPathsDto {
  @ApiPropertyOptional({
    description: 'Custom path used for homepage traffic on the custom domain',
    nullable: true,
    example: 'homepage',
  })
  @IsOptional()
  @IsString()
  homepageCustomPath?: string;

  @ApiPropertyOptional({
    description: 'Custom path used for marshmallow traffic on the custom domain',
    nullable: true,
    example: 'marshmallow',
  })
  @IsOptional()
  @IsString()
  marshmallowCustomPath?: string;
}

export class UpdateCustomDomainSslModeDto {
  @ApiProperty({
    description: 'SSL mode for the custom domain',
    enum: ['auto', 'self_hosted', 'cloudflare'],
    example: 'cloudflare',
  })
  @IsString()
  sslMode: 'auto' | 'self_hosted' | 'cloudflare';
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

const TALENT_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
    subsidiaryId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440100' },
    code: { type: 'string', example: 'SORA' },
    path: { type: 'string', example: '/TOKYO/SORA/' },
    nameEn: { type: 'string', example: 'Tokino Sora' },
    nameZh: { type: 'string', nullable: true, example: '时乃空' },
    nameJa: { type: 'string', nullable: true, example: 'ときのそら' },
    name: { type: 'string', example: 'Tokino Sora' },
    displayName: { type: 'string', example: 'Sora' },
    avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar/sora.jpg' },
    homepagePath: { type: 'string', nullable: true, example: 'sora' },
    timezone: { type: 'string', nullable: true, example: 'Asia/Tokyo' },
    lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'draft' },
    publishedAt: { type: 'string', nullable: true, format: 'date-time', example: null },
    publishedBy: { type: 'string', nullable: true, format: 'uuid', example: null },
    isActive: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: [
    'id',
    'subsidiaryId',
    'code',
    'path',
    'nameEn',
    'name',
    'displayName',
    'avatarUrl',
    'homepagePath',
    'timezone',
    'lifecycleStatus',
    'publishedAt',
    'publishedBy',
    'isActive',
    'createdAt',
    'updatedAt',
    'version',
  ],
};

const TALENT_PAGINATED_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: TALENT_LIST_ITEM_SCHEMA },
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
        id: '550e8400-e29b-41d4-a716-446655440300',
        subsidiaryId: '550e8400-e29b-41d4-a716-446655440100',
        code: 'SORA',
        path: '/TOKYO/SORA/',
        nameEn: 'Tokino Sora',
        nameZh: '时乃空',
        nameJa: 'ときのそら',
        name: 'Tokino Sora',
        displayName: 'Sora',
        avatarUrl: 'https://cdn.tcrn.app/avatar/sora.jpg',
        homepagePath: 'sora',
        timezone: 'Asia/Tokyo',
        lifecycleStatus: 'draft',
        publishedAt: null,
        publishedBy: null,
        isActive: false,
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

const TALENT_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      ...TALENT_LIST_ITEM_SCHEMA.properties,
      profileStoreId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440200' },
      profileStore: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
          code: { type: 'string', example: 'DEFAULT_STORE' },
          nameEn: { type: 'string', example: 'Default Profile Store' },
          nameZh: { type: 'string', nullable: true, example: '默认客户档案库' },
          nameJa: { type: 'string', nullable: true, example: 'デフォルトプロフィールストア' },
          translations: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: {
              en: 'Default Profile Store',
              zh_HANS: '默认客户档案库',
              zh_HANT: '預設客戶檔案庫',
            },
          },
          isDefault: { type: 'boolean', example: true },
          piiProxyUrl: { type: 'string', nullable: true, example: 'https://pii.internal.tcrn.app' },
        },
      },
      descriptionEn: { type: 'string', nullable: true, example: 'Main homepage profile' },
      descriptionZh: { type: 'string', nullable: true, example: '主页简介' },
      descriptionJa: { type: 'string', nullable: true, example: 'ホームページ用プロフィール' },
      settings: { type: 'object', additionalProperties: true },
      stats: {
        type: 'object',
        properties: {
          customerCount: { type: 'integer', example: 120 },
          homepageVersionCount: { type: 'integer', example: 3 },
          marshmallowMessageCount: { type: 'integer', example: 42 },
        },
        additionalProperties: true,
      },
      externalPagesDomain: {
        type: 'object',
        additionalProperties: true,
        example: {
          homepage: { isPublished: true },
          marshmallow: { isEnabled: true },
        },
      },
    },
    required: [...(TALENT_LIST_ITEM_SCHEMA.required as string[]), 'profileStoreId', 'profileStore', 'settings', 'stats', 'externalPagesDomain'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    subsidiaryId: '550e8400-e29b-41d4-a716-446655440100',
    profileStoreId: '550e8400-e29b-41d4-a716-446655440200',
    profileStore: {
      id: '550e8400-e29b-41d4-a716-446655440200',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: '默认客户档案库',
      nameJa: 'デフォルトプロフィールストア',
      translations: {
        en: 'Default Profile Store',
        zh_HANS: '默认客户档案库',
        zh_HANT: '預設客戶檔案庫',
      },
      isDefault: true,
      piiProxyUrl: 'https://pii.internal.tcrn.app',
    },
    code: 'SORA',
    path: '/TOKYO/SORA/',
    nameEn: 'Tokino Sora',
    nameZh: '时乃空',
    nameJa: 'ときのそら',
    name: 'Tokino Sora',
    displayName: 'Sora',
    descriptionEn: 'Main homepage profile',
    descriptionZh: '主页简介',
    descriptionJa: 'ホームページ用プロフィール',
    avatarUrl: 'https://cdn.tcrn.app/avatar/sora.jpg',
    homepagePath: 'sora',
    timezone: 'Asia/Tokyo',
    lifecycleStatus: 'draft',
    publishedAt: null,
    publishedBy: null,
    isActive: false,
    settings: { homepageEnabled: true, marshmallowEnabled: true, inheritTimezone: false },
    stats: { customerCount: 120, homepageVersionCount: 3, marshmallowMessageCount: 42 },
    externalPagesDomain: { homepage: { isPublished: true }, marshmallow: { isEnabled: true } },
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const TALENT_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
      subsidiaryId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440100' },
      code: { type: 'string', example: 'SORA' },
      path: { type: 'string', example: '/TOKYO/SORA/' },
      nameEn: { type: 'string', example: 'Tokino Sora' },
      name: { type: 'string', example: 'Tokino Sora' },
      displayName: { type: 'string', example: 'Sora' },
      avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar/sora.jpg' },
      homepagePath: { type: 'string', nullable: true, example: 'sora' },
      timezone: { type: 'string', nullable: true, example: 'Asia/Tokyo' },
      lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'draft' },
      publishedAt: { type: 'string', nullable: true, format: 'date-time', example: null },
      publishedBy: { type: 'string', nullable: true, format: 'uuid', example: null },
      isActive: { type: 'boolean', example: false },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
      version: { type: 'integer', example: 1 },
    },
    required: [
      'id',
      'subsidiaryId',
      'code',
      'path',
      'nameEn',
      'name',
      'displayName',
      'avatarUrl',
      'homepagePath',
      'timezone',
      'lifecycleStatus',
      'publishedAt',
      'publishedBy',
      'isActive',
      'createdAt',
      'version',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    subsidiaryId: '550e8400-e29b-41d4-a716-446655440100',
    code: 'SORA',
    path: '/TOKYO/SORA/',
    nameEn: 'Tokino Sora',
    name: 'Tokino Sora',
    displayName: 'Sora',
    avatarUrl: 'https://cdn.tcrn.app/avatar/sora.jpg',
    homepagePath: 'sora',
    timezone: 'Asia/Tokyo',
    lifecycleStatus: 'draft',
    publishedAt: null,
    publishedBy: null,
    isActive: false,
    createdAt: '2026-04-13T08:00:00.000Z',
    version: 1,
  },
);

const TALENT_UPDATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
      nameEn: { type: 'string', example: 'Tokino Sora' },
      nameZh: { type: 'string', nullable: true, example: '时乃空' },
      nameJa: { type: 'string', nullable: true, example: 'ときのそら' },
      name: { type: 'string', example: 'Tokino Sora' },
      displayName: { type: 'string', example: 'Sora' },
      homepagePath: { type: 'string', nullable: true, example: 'sora' },
      lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'draft' },
      publishedAt: { type: 'string', nullable: true, format: 'date-time', example: null },
      publishedBy: { type: 'string', nullable: true, format: 'uuid', example: null },
      isActive: { type: 'boolean', example: false },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:20:00.000Z' },
      version: { type: 'integer', example: 2 },
    },
    required: ['id', 'nameEn', 'name', 'displayName', 'homepagePath', 'lifecycleStatus', 'publishedAt', 'publishedBy', 'isActive', 'updatedAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    nameEn: 'Tokino Sora',
    nameZh: '时乃空',
    nameJa: 'ときのそら',
    name: 'Tokino Sora',
    displayName: 'Sora',
    homepagePath: 'sora',
    lifecycleStatus: 'draft',
    publishedAt: null,
    publishedBy: null,
    isActive: false,
    updatedAt: '2026-04-13T09:20:00.000Z',
    version: 2,
  },
);

const TALENT_LIFECYCLE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
      lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'published' },
      publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
      publishedBy: { type: 'string', nullable: true, format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
      isActive: { type: 'boolean', example: true },
      version: { type: 'integer', example: 3 },
    },
    required: ['id', 'lifecycleStatus', 'publishedAt', 'publishedBy', 'isActive', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    lifecycleStatus: 'published',
    publishedAt: '2026-04-13T09:30:00.000Z',
    publishedBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true,
    version: 3,
  },
);

const TALENT_DELETE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440300',
      },
      deleted: {
        type: 'boolean',
        example: true,
      },
    },
    required: ['id', 'deleted'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    deleted: true,
  },
);

const TALENT_PUBLISH_READINESS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
      lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'draft' },
      targetState: { type: 'string', example: 'published' },
      recommendedAction: { type: 'string', example: 'publish' },
      canEnterPublishedState: { type: 'boolean', example: false },
      blockers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'PROFILE_STORE_REQUIRED' },
            message: { type: 'string', example: 'Talent must be bound to an active profile store before publish.' },
          },
          required: ['code', 'message'],
        },
      },
      warnings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'HOMEPAGE_NOT_PUBLISHED' },
            message: { type: 'string', example: 'Homepage content is still unpublished.' },
          },
          required: ['code', 'message'],
        },
      },
      version: { type: 'integer', example: 1 },
    },
    required: ['id', 'lifecycleStatus', 'targetState', 'recommendedAction', 'canEnterPublishedState', 'blockers', 'warnings', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    lifecycleStatus: 'draft',
    targetState: 'published',
    recommendedAction: 'publish',
    canEnterPublishedState: false,
    blockers: [
      {
        code: 'PROFILE_STORE_REQUIRED',
        message: 'Talent must be bound to an active profile store before publish.',
      },
    ],
    warnings: [
      {
        code: 'HOMEPAGE_NOT_PUBLISHED',
        message: 'Homepage content is still unpublished.',
      },
    ],
    version: 1,
  },
);

const TALENT_CUSTOM_DOMAIN_CONFIG_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      customDomain: { type: 'string', nullable: true, example: 'fans.example.com' },
      customDomainVerified: { type: 'boolean', example: true },
      customDomainVerificationToken: { type: 'string', nullable: true, example: 'aabbccddeeff00112233445566778899' },
      customDomainSslMode: { type: 'string', example: 'cloudflare' },
      homepageCustomPath: { type: 'string', nullable: true, example: 'homepage' },
      marshmallowCustomPath: { type: 'string', nullable: true, example: 'marshmallow' },
    },
    required: ['customDomain', 'customDomainVerified', 'customDomainVerificationToken', 'customDomainSslMode', 'homepageCustomPath', 'marshmallowCustomPath'],
  },
  {
    customDomain: 'fans.example.com',
    customDomainVerified: true,
    customDomainVerificationToken: 'aabbccddeeff00112233445566778899',
    customDomainSslMode: 'cloudflare',
    homepageCustomPath: 'homepage',
    marshmallowCustomPath: 'marshmallow',
  },
);

const TALENT_SET_CUSTOM_DOMAIN_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      customDomain: { type: 'string', nullable: true, example: 'fans.example.com' },
      token: { type: 'string', nullable: true, example: 'aabbccddeeff00112233445566778899' },
      txtRecord: { type: 'string', nullable: true, example: 'tcrn-verify=aabbccddeeff00112233445566778899' },
    },
    required: ['customDomain', 'token', 'txtRecord'],
  },
  {
    customDomain: 'fans.example.com',
    token: 'aabbccddeeff00112233445566778899',
    txtRecord: 'tcrn-verify=aabbccddeeff00112233445566778899',
  },
);

const TALENT_VERIFY_CUSTOM_DOMAIN_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      verified: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Domain verified successfully' },
    },
    required: ['verified', 'message'],
  },
  {
    verified: true,
    message: 'Domain verified successfully',
  },
);

const TALENT_CUSTOM_DOMAIN_PATHS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      homepageCustomPath: { type: 'string', nullable: true, example: 'homepage' },
      marshmallowCustomPath: { type: 'string', nullable: true, example: 'marshmallow' },
    },
    required: ['homepageCustomPath', 'marshmallowCustomPath'],
  },
  {
    homepageCustomPath: 'homepage',
    marshmallowCustomPath: 'marshmallow',
  },
);

const TALENT_CUSTOM_DOMAIN_SSL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      customDomainSslMode: { type: 'string', example: 'cloudflare' },
    },
    required: ['customDomainSslMode'],
  },
  {
    customDomainSslMode: 'cloudflare',
  },
);

const TALENT_MOVE_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_CONFLICT,
  'Talent move has been retired from normal product flow. If structural correction is required, it must be performed via direct database intervention.',
);

const TALENT_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Talent request is invalid',
);

const TALENT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const TALENT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Talent not found',
);

const TALENT_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
  'Talent cannot perform this lifecycle action from its current state.',
);

const TALENT_DELETE_CONFLICT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        },
        message: {
          type: 'string',
          example:
            'Draft talent cannot be hard-deleted because protected dependent data already exists.',
        },
        details: {
          type: 'object',
          properties: {
            lifecycleStatus: {
              type: 'string',
              enum: ['draft', 'published', 'disabled'],
              nullable: true,
              example: 'published',
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'CUSTOMER_PROFILE_EXISTS' },
                  count: { type: 'integer', example: 3 },
                  message: {
                    type: 'string',
                    example:
                      'Customer profiles already exist for this talent.',
                  },
                },
                required: ['code', 'count', 'message'],
              },
            },
          },
          additionalProperties: true,
        },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
      message:
        'Draft talent cannot be hard-deleted because protected dependent data already exists.',
      details: {
        dependencies: [
          {
            code: 'CUSTOMER_PROFILE_EXISTS',
            count: 3,
            message: 'Customer profiles already exist for this talent.',
          },
        ],
      },
    },
  },
};

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
 * Talent Controller
 * Manages artists/VTubers
 */
@ApiTags('Org - Talents')
@Controller('talents')
@ApiBearerAuth()
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  /**
   * GET /api/v1/talents
   * List talents
   */
  @Get()
  @ApiOperation({ summary: 'List talents' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated talents',
    schema: TALENT_PAGINATED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTalentsQueryDto,
  ) {
    const { data, total } = await this.talentService.list(
      user.tenantSchema,
      {
        page: query.page,
        pageSize: query.pageSize,
        subsidiaryId: query.subsidiaryId === 'null' ? null : query.subsidiaryId,
        search: query.search,
        isActive: query.isActive,
        sort: query.sort,
      }
    );

    const enrichedData = data.map((talent) => {
      const translations = buildManagedNameTranslations(talent);

      return {
        id: talent.id,
        subsidiaryId: talent.subsidiaryId,
        code: talent.code,
        path: talent.path,
        nameEn: talent.nameEn,
        nameZh: talent.nameZh,
        nameJa: talent.nameJa,
        translations,
        name: translations.en || getLocalizedName(talent),
        displayName: talent.displayName,
        avatarUrl: talent.avatarUrl,
        homepagePath: talent.homepagePath,
        timezone: talent.timezone,
        lifecycleStatus: talent.lifecycleStatus,
        publishedAt: talent.publishedAt?.toISOString() ?? null,
        publishedBy: talent.publishedBy,
        isActive: talent.isActive,
        createdAt: talent.createdAt.toISOString(),
        updatedAt: talent.updatedAt.toISOString(),
        version: talent.version,
      };
    });

    return paginated(enrichedData, {
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalCount: total,
    });
  }

  /**
   * POST /api/v1/talents
   * Create talent
   */
  @Post()
  @ApiOperation({ summary: 'Create talent' })
  @ApiResponse({
    status: 201,
    description: 'Creates a talent',
    schema: TALENT_CREATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Talent payload is invalid or conflicts with existing talent/profile-store constraints',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Owning subsidiary was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTalentDto,
  ) {
    const talent = await this.talentService.create(
      user.tenantSchema,
      {
        subsidiaryId: dto.subsidiaryId,
        profileStoreId: dto.profileStoreId,
        code: dto.code,
        nameEn: dto.nameEn,
        nameZh: dto.nameZh,
        nameJa: dto.nameJa,
        translations: dto.translations,
        displayName: dto.displayName,
        descriptionEn: dto.descriptionEn,
        descriptionZh: dto.descriptionZh,
        descriptionJa: dto.descriptionJa,
        avatarUrl: dto.avatarUrl,
        homepagePath: dto.homepagePath,
        timezone: dto.timezone,
        settings: dto.settings,
      },
      user.id
    );

    const translations = buildManagedNameTranslations(talent);

    return success({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      code: talent.code,
      path: talent.path,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      translations,
      name: translations.en || getLocalizedName(talent),
      displayName: talent.displayName,
      avatarUrl: talent.avatarUrl,
      homepagePath: talent.homepagePath,
      timezone: talent.timezone,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      createdAt: talent.createdAt.toISOString(),
      version: talent.version,
    });
  }

  /**
   * GET /api/v1/talents/:talentId
   * Get talent details
   */
  @Get(':talentId')
  @ApiOperation({ summary: 'Get talent details' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns talent detail',
    schema: TALENT_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read talent detail',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
  ) {
    const talent = await this.talentService.findById(talentId, user.tenantSchema);
    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    // Get talent statistics, external pages domain config, and profile store info
    const [stats, externalPagesDomain, profileStore] = await Promise.all([
      this.talentService.getTalentStats(talentId, user.tenantSchema),
      this.talentService.getExternalPagesDomainConfig(talentId, user.tenantSchema),
      talent.profileStoreId 
        ? this.talentService.getProfileStoreById(talent.profileStoreId, user.tenantSchema)
        : null,
    ]);

    const translations = buildManagedNameTranslations(talent);
    const profileStoreTranslations = profileStore ? buildManagedNameTranslations(profileStore) : null;

    return success({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      profileStoreId: talent.profileStoreId,
      profileStore: profileStore ? {
        id: profileStore.id,
        code: profileStore.code,
        nameEn: profileStore.nameEn,
        nameZh: profileStore.nameZh,
        nameJa: profileStore.nameJa,
        translations: profileStoreTranslations ?? {},
        isDefault: profileStore.isDefault,
        piiProxyUrl: profileStore.piiProxyUrl,
      } : null,
      code: talent.code,
      path: talent.path,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      translations,
      name: translations.en || getLocalizedName(talent),
      displayName: talent.displayName,
      descriptionEn: talent.descriptionEn,
      descriptionZh: talent.descriptionZh,
      descriptionJa: talent.descriptionJa,
      avatarUrl: talent.avatarUrl,
      homepagePath: talent.homepagePath,
      timezone: talent.timezone,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      settings: talent.settings,
      stats,
      externalPagesDomain,
      createdAt: talent.createdAt.toISOString(),
      updatedAt: talent.updatedAt.toISOString(),
      version: talent.version,
    });
  }

  /**
   * PATCH /api/v1/talents/:talentId
   * Update talent
   */
  @Patch(':talentId')
  @ApiOperation({ summary: 'Update talent' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated talent',
    schema: TALENT_UPDATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Talent update request is invalid or version-mismatched',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: UpdateTalentDto,
  ) {
    const talent = await this.talentService.update(
      talentId,
      user.tenantSchema,
      dto,
      user.id
    );

    const translations = buildManagedNameTranslations(talent);

    return success({
      id: talent.id,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      translations,
      name: translations.en || getLocalizedName(talent),
      displayName: talent.displayName,
      homepagePath: talent.homepagePath,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      updatedAt: talent.updatedAt.toISOString(),
      version: talent.version,
    });
  }

  /**
   * DELETE /api/v1/talents/:talentId
   * Hard-delete a draft talent
   */
  @Delete(':talentId')
  @ApiOperation({ summary: 'Delete draft talent' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'version',
    required: true,
    description: 'Optimistic lock version required for hard delete',
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiResponse({
    status: 200,
    description: 'Hard-deletes a draft talent',
    schema: TALENT_DELETE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Delete request is invalid or version-mismatched',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to delete talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Talent lifecycle or protected dependent data blocks hard delete',
    schema: TALENT_DELETE_CONFLICT_SCHEMA,
  })
  async deleteTalent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: DeleteTalentQueryDto,
  ) {
    const result = await this.talentService.delete(talentId, user.tenantSchema, {
      version: query.version,
    });

    return success(result);
  }

  /**
   * POST /api/v1/talents/:talentId/move
   * Retained only to fail closed; structural move is supported only by direct database intervention
   */
  @Post(':talentId/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move talent (retired; direct database intervention only)' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to attempt talent move',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Talent move is retired from normal product flow',
    schema: TALENT_MOVE_CONFLICT_SCHEMA,
  })
  async move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: MoveTalentDto,
  ) {
    const talent = await this.talentService.move(
      talentId,
      user.tenantSchema,
      dto.newSubsidiaryId ?? null,
      dto.version,
      user.id
    );

    return success({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      path: talent.path,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      version: talent.version,
    });
  }

  /**
   * GET /api/v1/talents/:talentId/publish-readiness
   * Get publish readiness
   */
  @Get(':talentId/publish-readiness')
  @ApiOperation({ summary: 'Get talent publish readiness' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns talent publish readiness',
    schema: TALENT_PUBLISH_READINESS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read publish readiness',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async getPublishReadiness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
  ) {
    const readiness = await this.talentService.getPublishReadiness(talentId, user.tenantSchema);

    return success(readiness);
  }

  /**
   * POST /api/v1/talents/:talentId/publish
   * Publish talent business workspace
   */
  @Post(':talentId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish talent' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Publishes the talent workspace',
    schema: TALENT_LIFECYCLE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Publish request is invalid or version-mismatched',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to publish talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Talent lifecycle state blocks publish',
    schema: TALENT_CONFLICT_SCHEMA,
  })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: TalentLifecycleMutationDto,
  ) {
    const talent = await this.talentService.publish(
      talentId,
      user.tenantSchema,
      dto.version,
      user.id
    );

    return success({
      id: talent.id,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      version: talent.version,
    });
  }

  /**
   * POST /api/v1/talents/:talentId/disable
   * Disable talent business workspace
   */
  @Post(':talentId/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable talent' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Disables the talent workspace',
    schema: TALENT_LIFECYCLE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Disable request is invalid or version-mismatched',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to disable talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Talent lifecycle state blocks disable',
    schema: TALENT_CONFLICT_SCHEMA,
  })
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: TalentLifecycleMutationDto,
  ) {
    const talent = await this.talentService.disable(
      talentId,
      user.tenantSchema,
      dto.version,
      user.id
    );

    return success({
      id: talent.id,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      version: talent.version,
    });
  }

  /**
   * POST /api/v1/talents/:talentId/re-enable
   * Re-enable talent business workspace
   */
  @Post(':talentId/re-enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enable talent' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Re-enables the talent workspace',
    schema: {
      ...TALENT_LIFECYCLE_SUCCESS_SCHEMA,
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440300',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-13T09:30:00.000Z',
          publishedBy: '550e8400-e29b-41d4-a716-446655440001',
          isActive: true,
          version: 4,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Re-enable request is invalid or version-mismatched',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to re-enable talents',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Talent lifecycle state blocks re-enable',
    schema: TALENT_CONFLICT_SCHEMA,
  })
  async reEnable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: TalentLifecycleMutationDto,
  ) {
    const talent = await this.talentService.reEnable(
      talentId,
      user.tenantSchema,
      dto.version,
      user.id
    );

    return success({
      id: talent.id,
      lifecycleStatus: talent.lifecycleStatus,
      publishedAt: talent.publishedAt?.toISOString() ?? null,
      publishedBy: talent.publishedBy,
      isActive: talent.isActive,
      version: talent.version,
    });
  }

  // =============================================================================
  // UNIFIED CUSTOM DOMAIN MANAGEMENT
  // =============================================================================

  /**
   * GET /api/v1/talents/:talentId/custom-domain
   * Get custom domain configuration
   */
  @Get(':talentId/custom-domain')
  @ApiOperation({ summary: 'Get custom domain configuration' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns custom-domain configuration for the talent',
    schema: TALENT_CUSTOM_DOMAIN_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read custom-domain configuration',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async getCustomDomainConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
  ) {
    const config = await this.talentService.getCustomDomainConfig(talentId, user.tenantSchema);
    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }
    return success(config);
  }

  /**
   * POST /api/v1/talents/:talentId/custom-domain
   * Set custom domain
   */
  @Post(':talentId/custom-domain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set custom domain' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Sets or clears the custom domain for the talent',
    schema: TALENT_SET_CUSTOM_DOMAIN_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Custom-domain request is invalid',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to set a custom domain',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async setCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() body: SetCustomDomainDto,
  ) {
    const result = await this.talentService.setCustomDomain(
      talentId,
      user.tenantSchema,
      body.customDomain
    );
    return success(result);
  }

  /**
   * POST /api/v1/talents/:talentId/custom-domain/verify
   * Verify custom domain
   */
  @Post(':talentId/custom-domain/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify custom domain' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns current verification result for the custom domain',
    schema: TALENT_VERIFY_CUSTOM_DOMAIN_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Custom-domain verification request is invalid',
    schema: TALENT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to verify a custom domain',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async verifyCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
  ) {
    const result = await this.talentService.verifyCustomDomain(talentId, user.tenantSchema);
    return success(result);
  }

  /**
   * PATCH /api/v1/talents/:talentId/custom-domain/paths
   * Return the fixed service paths for custom domains.
   */
  @Patch(':talentId/custom-domain/paths')
  @ApiOperation({ summary: 'Return fixed custom-domain service paths (compatibility endpoint)' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the fixed homepage and marshmallow custom-domain paths',
    schema: TALENT_CUSTOM_DOMAIN_PATHS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update custom-domain paths',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async updateServicePaths(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() body: UpdateCustomDomainPathsDto,
  ) {
    const result = await this.talentService.updateServicePaths(
      talentId,
      user.tenantSchema,
      body
    );
    return success(result);
  }

  /**
   * PATCH /api/v1/talents/:talentId/custom-domain/ssl-mode
   * Update SSL mode for custom domain
   */
  @Patch(':talentId/custom-domain/ssl-mode')
  @ApiOperation({ summary: 'Update custom domain SSL mode' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Updates custom-domain SSL mode',
    schema: TALENT_CUSTOM_DOMAIN_SSL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update custom-domain SSL mode',
    schema: TALENT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found',
    schema: TALENT_NOT_FOUND_SCHEMA,
  })
  async updateSslMode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() body: UpdateCustomDomainSslModeDto,
  ) {
    const result = await this.talentService.updateSslMode(
      talentId,
      user.tenantSchema,
      body.sslMode
    );
    return success(result);
  }
}
