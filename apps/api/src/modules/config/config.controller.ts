// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { paginated, success } from '../../common/response.util';
import { BlocklistService } from './blocklist.service';
import { ConfigService } from './config.service';
import { OwnerType } from './config.types';
import { assertValidConfigEntityType, RequireConfigEntityPermission } from './config-rbac';
import { ConsumerKeyService } from './consumer-key.service';

function getRequestLanguage(req: Request): string {
  const rawHeader = req.headers['accept-language'];
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  return header?.split(',')[0]?.trim() || 'en';
}

// DTOs
class ListConfigQueryDto {
  @ApiPropertyOptional({ description: 'Scope type filter', enum: ['tenant', 'subsidiary', 'talent'], example: 'talent' })
  @IsOptional()
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType?: OwnerType;

  @ApiPropertyOptional({ description: 'Scope ID filter', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Include inherited configs', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInherited?: boolean;

  @ApiPropertyOptional({ description: 'Include disabled configs', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDisabled?: boolean;

  @ApiPropertyOptional({ description: 'Include inactive configs', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Only show configs owned by current scope', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  ownerOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search keyword', example: 'VIP' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Parent ID for hierarchical configs', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 50, minimum: 1, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'sortOrder' })
  @IsOptional()
  @IsString()
  sort?: string;
}

class CreateConfigDto {
  @ApiProperty({ description: 'Config code (uppercase)', example: 'VIP_STATUS', pattern: '^[A-Z0-9_]{3,32}$' })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @ApiProperty({ description: 'Name in English', example: 'VIP Status', minLength: 1 })
  @IsString()
  @MinLength(1)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: 'VIP状态' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'VIPステータス' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Locale-keyed name translations',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { en: 'VIP Status', zh_HANS: 'VIP状态', zh_HANT: 'VIP狀態', ja: 'VIPステータス', ko: 'VIP 상태', fr: 'Statut VIP' },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Customer VIP status indicator' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '客户VIP状态指示器' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '顧客VIPステータスインジケーター' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({
    description: 'Locale-keyed description translations',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { en: 'Customer VIP status indicator', zh_HANS: '客户VIP状态指示器', ja: '顧客VIPステータスインジケーター' },
  })
  @IsOptional()
  @IsObject()
  descriptionTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Locale-keyed consent content translations',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { en: 'Consent content', zh_HANS: '同意内容', ja: '同意内容' },
  })
  @IsOptional()
  @IsObject()
  contentTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Entity-specific JSON metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Sort order for display', example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Force use (cannot be disabled)', example: false })
  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean;

  @ApiPropertyOptional({ description: 'Owner type for scoped configs', enum: ['tenant', 'subsidiary', 'talent'] })
  @IsOptional()
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  ownerType?: OwnerType;

  @ApiPropertyOptional({ description: 'Owner ID for scoped configs', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  // Social Platform specific fields
  @ApiPropertyOptional({ description: 'Display name for social platform', example: 'Twitter/X' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Brand color (hex)', example: '#1DA1F2' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Base URL for platform', example: 'https://twitter.com' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Icon URL', example: 'https://example.com/icons/twitter.svg' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'URL pattern for validation', example: 'https://twitter.com/{username}' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Profile URL template', example: 'https://twitter.com/{username}' })
  @IsOptional()
  @IsString()
  profileUrlTemplate?: string;

  @ApiPropertyOptional({ description: 'Consumer category', enum: ['internal', 'external', 'partner'] })
  @IsOptional()
  @IsEnum(['internal', 'external', 'partner'])
  consumerCategory?: 'internal' | 'external' | 'partner';

  @ApiPropertyOptional({ description: 'Consumer contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Consumer contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Allowed IP addresses or CIDR blocks',
    type: [String],
    example: ['192.168.1.10', '10.0.0.0/8'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Per-minute rate limit', example: 1000, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Consumer notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Allow any additional fields for entity-specific properties
  [key: string]: unknown;
}

class UpdateConfigDto {
  @ApiPropertyOptional({ description: 'Name in English', example: 'Updated Name' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '更新的名称' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: '更新された名前' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Locale-keyed name translations',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

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

  @ApiPropertyOptional({
    description: 'Locale-keyed description translations',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  descriptionTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Locale-keyed consent content translations',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  contentTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Entity-specific JSON metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Sort order', example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Force use (cannot be disabled)', example: false })
  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean;

  @ApiPropertyOptional({ description: 'Display name for social platform', example: 'Twitter/X' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Brand color (hex)', example: '#1DA1F2' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Base URL for platform', example: 'https://twitter.com' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Icon URL', example: 'https://example.com/icons/twitter.svg' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'URL pattern for validation', example: 'https://twitter.com/{username}' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Profile URL template', example: 'https://twitter.com/{username}' })
  @IsOptional()
  @IsString()
  profileUrlTemplate?: string;

  @ApiPropertyOptional({ description: 'Consumer category', enum: ['internal', 'external', 'partner'] })
  @IsOptional()
  @IsEnum(['internal', 'external', 'partner'])
  consumerCategory?: 'internal' | 'external' | 'partner';

  @ApiPropertyOptional({ description: 'Consumer contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Consumer contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Allowed IP addresses or CIDR blocks',
    type: [String],
    example: ['192.168.1.10', '10.0.0.0/8'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Per-minute rate limit', example: 1000, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Consumer notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;

  [key: string]: unknown;
}

class ScopeDto {
  @ApiProperty({ description: 'Scope type', enum: ['subsidiary', 'talent'], example: 'talent' })
  @IsEnum(['subsidiary', 'talent'])
  scopeType: OwnerType;

  @ApiProperty({ description: 'Scope ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  scopeId: string;
}

class TestBlocklistTextDto {
  @ApiProperty({ description: 'Scope type for blocklist', enum: ['tenant', 'subsidiary', 'talent'], example: 'talent' })
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType: OwnerType;

  @ApiPropertyOptional({ description: 'Scope ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiProperty({ description: 'Text to test against blocklist', example: 'test message content', minLength: 1 })
  @IsString()
  @MinLength(1)
  text: string;
}

/**
 * Config Controller
 * Generic CRUD operations for configuration entities
 * Route: /api/v1/configuration-entity/:entityType
 */
@ApiTags('System - Config')
@Controller('configuration-entity')
@ApiBearerAuth()
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly blocklistService: BlocklistService,
    private readonly consumerKeyService: ConsumerKeyService,
  ) {}

  /**
   * GET /api/v1/config/:entityType
   * List config entities
  */
  @Get(':entityType')
  @RequireConfigEntityPermission('read')
  @ApiOperation({ summary: 'List config entities' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Query() query: ListConfigQueryDto,
    @Req() req: Request,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const language = getRequestLanguage(req);

    const { data, total } = await this.configService.list(
      validEntityType,
      user.tenantSchema,
      {
        scopeType: query.scopeType,
        scopeId: query.scopeId,
        includeInherited: query.includeInherited,
        includeDisabled: query.includeDisabled,
        includeInactive: query.includeInactive,
        ownerOnly: query.ownerOnly,
        search: query.search,
        parentId: query.parentId,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        language,
      }
    );

    return paginated(data, {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      totalCount: total,
    });
  }

  /**
   * POST /api/v1/config/:entityType
   * Create config entity
  */
  @Post(':entityType')
  @RequireConfigEntityPermission('create')
  @ApiOperation({ summary: 'Create config entity' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Body() dto: CreateConfigDto,
    @Req() req: Request,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const language = getRequestLanguage(req);
    const normalizedDto = {
      ...dto,
      profileUrlTemplate:
        typeof dto.profileUrlTemplate === 'string'
          ? dto.profileUrlTemplate
          : dto.urlPattern,
    };

    const entity = await this.configService.create(
      validEntityType,
      user.tenantSchema,
      normalizedDto,
      user.id
    );

    const result = await this.configService.findById(validEntityType, entity.id, user.tenantSchema, language);

    return success(result);
  }

  /**
   * GET /api/v1/config/:entityType/:id
   * Get config entity details
  */
  @Get(':entityType/:id')
  @RequireConfigEntityPermission('read')
  @ApiOperation({ summary: 'Get config entity details' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const language = getRequestLanguage(req);

    const entity = await this.configService.findById(validEntityType, id, user.tenantSchema, language);
    if (!entity) {
      throw new NotFoundException({
        code: 'CONFIG_NOT_FOUND',
        message: 'Config entity not found',
      });
    }

    return success(entity);
  }

  /**
   * PATCH /api/v1/config/:entityType/:id
   * Update config entity
  */
  @Patch(':entityType/:id')
  @RequireConfigEntityPermission('update')
  @ApiOperation({ summary: 'Update config entity' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: UpdateConfigDto,
    @Req() req: Request,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const language = getRequestLanguage(req);
    const normalizedDto = {
      ...dto,
      profileUrlTemplate:
        typeof dto.profileUrlTemplate === 'string'
          ? dto.profileUrlTemplate
          : dto.urlPattern,
    };

    const entity = await this.configService.update(
      validEntityType,
      id,
      user.tenantSchema,
      normalizedDto,
      user.id
    );

    const result = await this.configService.findById(validEntityType, entity.id, user.tenantSchema, language);

    return success(result);
  }

  /**
   * POST /api/v1/config/:entityType/:id/deactivate
   * Deactivate config entity
  */
  @Post(':entityType/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequireConfigEntityPermission('update')
  @ApiOperation({ summary: 'Deactivate config entity' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const entity = await this.configService.deactivate(
      validEntityType,
      id,
      user.tenantSchema,
      body.version,
      user.id
    );

    return success({
      id: entity.id,
      isActive: false,
      deactivatedAt: new Date().toISOString(),
    });
  }

  /**
   * POST /api/v1/config/:entityType/:id/reactivate
   * Reactivate config entity
  */
  @Post(':entityType/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequireConfigEntityPermission('update')
  @ApiOperation({ summary: 'Reactivate config entity' })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    const entity = await this.configService.reactivate(
      validEntityType,
      id,
      user.tenantSchema,
      body.version,
      user.id
    );

    return success({
      id: entity.id,
      isActive: true,
    });
  }

  /**
   * POST /api/v1/config/:entityType/:id/disable
   * Disable inherited config in current scope
  */
  @Post(':entityType/:id/disable')
  @HttpCode(HttpStatus.OK)
  @RequireConfigEntityPermission('update')
  @ApiOperation({ summary: 'Disable inherited config' })
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: ScopeDto,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    await this.configService.disableInScope(
      validEntityType,
      id,
      user.tenantSchema,
      dto.scopeType,
      dto.scopeId,
      user.id
    );

    return success({
      message: 'Config disabled in current scope',
    });
  }

  /**
   * POST /api/v1/config/:entityType/:id/enable
   * Enable previously disabled inherited config
  */
  @Post(':entityType/:id/enable')
  @HttpCode(HttpStatus.OK)
  @RequireConfigEntityPermission('update')
  @ApiOperation({ summary: 'Enable inherited config' })
  async enable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: ScopeDto,
  ) {
    const validEntityType = assertValidConfigEntityType(entityType);

    await this.configService.enableInScope(
      validEntityType,
      id,
      user.tenantSchema,
      dto.scopeType,
      dto.scopeId
    );

    return success({
      message: 'Config enabled in current scope',
    });
  }

  /**
   * GET /api/v1/configuration-entity/membership-tree
   * Get full membership tree structure (Class -> Type -> Level)
  */
  @Get('membership-tree')
  @RequirePermissions({ resource: 'config.membership', action: 'read' })
  @ApiOperation({ summary: 'Get membership tree' })
  async getMembershipTree(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: { scopeType?: OwnerType; scopeId?: string; includeInactive?: boolean },
    @Req() req: Request,
  ) {
    const language = getRequestLanguage(req);
    
    const tree = await this.configService.getMembershipTree(
      user.tenantSchema,
      {
        scopeType: query.scopeType,
        scopeId: query.scopeId,
        includeInactive: query.includeInactive === true,
        language,
      }
    );

    return success(tree);
  }

  /**
   * GET /api/v1/configuration-entity/membership-classes/:classId/types
   * Get types under a specific membership class
  */
  @Get('membership-classes/:classId/types')
  @RequirePermissions({ resource: 'config.membership', action: 'read' })
  @ApiOperation({ summary: 'Get membership types by class' })
  async getMembershipTypesByClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ListConfigQueryDto,
    @Req() req: Request,
  ) {
    const language = getRequestLanguage(req);

    const { data, total } = await this.configService.list(
      'membership-type',
      user.tenantSchema,
      {
        parentId: classId,
        includeInactive: query.includeInactive,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        language,
      }
    );

    return paginated(data, {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      totalCount: total,
    });
  }

  /**
   * GET /api/v1/configuration-entity/membership-types/:typeId/levels
   * Get levels under a specific membership type
  */
  @Get('membership-types/:typeId/levels')
  @RequirePermissions({ resource: 'config.membership', action: 'read' })
  @ApiOperation({ summary: 'Get membership levels by type' })
  async getMembershipLevelsByType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('typeId') typeId: string,
    @Query() query: ListConfigQueryDto,
    @Req() req: Request,
  ) {
    const language = getRequestLanguage(req);

    const { data, total } = await this.configService.list(
      'membership-level',
      user.tenantSchema,
      {
        parentId: typeId,
        includeInactive: query.includeInactive,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        language,
      }
    );

    return paginated(data, {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      totalCount: total,
    });
  }

  /**
   * POST /api/v1/configuration-entity/consumer/:consumerId/generate-key
   * Generate a new API key for a consumer
  */
  @Post('consumer/:consumerId/generate-key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Generate API key for consumer' })
  async generateConsumerKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('consumerId') consumerId: string,
  ) {
    const result = await this.consumerKeyService.generateApiKey(
      consumerId,
      user.tenantSchema,
      user.id
    );

    return success({
      message: 'API key generated successfully. Please save it securely - it will not be shown again.',
      apiKey: result.apiKey,
      apiKeyPrefix: result.apiKeyPrefix,
    });
  }

  /**
   * POST /api/v1/configuration-entity/consumer/:consumerId/rotate-key
   * Rotate (regenerate) API key for a consumer
  */
  @Post('consumer/:consumerId/rotate-key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Rotate API key for consumer' })
  async rotateConsumerKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('consumerId') consumerId: string,
  ) {
    const result = await this.consumerKeyService.rotateApiKey(
      consumerId,
      user.tenantSchema,
      user.id
    );

    return success({
      message: 'API key rotated successfully. Please save the new key securely - it will not be shown again.',
      apiKey: result.apiKey,
      apiKeyPrefix: result.apiKeyPrefix,
    });
  }

  /**
   * POST /api/v1/configuration-entity/consumer/:consumerId/revoke-key
   * Revoke API key for a consumer
  */
  @Post('consumer/:consumerId/revoke-key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Revoke API key for consumer' })
  async revokeConsumerKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('consumerId') consumerId: string,
  ) {
    await this.consumerKeyService.revokeApiKey(
      consumerId,
      user.tenantSchema,
      user.id
    );

    return success({
      message: 'API key revoked successfully',
    });
  }

  /**
   * POST /api/v1/config/blocklist-entry/test
   * Test text against blocklist
  */
  @Post('blocklist-entry/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Test blocklist' })
  async testBlocklist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TestBlocklistTextDto,
  ) {
    const result = await this.blocklistService.testText(
      user.tenantSchema,
      dto.scopeType,
      dto.scopeId || null,
      dto.text
    );

    return success(result);
  }

  /**
   * GET /api/v1/config/blocklist-entry/effective
   * Get effective blocklist entries
  */
  @Get('blocklist-entry/effective')
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get effective blocklist' })
  async getEffectiveBlocklist(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: { scopeType?: OwnerType; scopeId?: string },
  ) {
    const entries = await this.blocklistService.getEffectiveEntries(
      user.tenantSchema,
      query.scopeType || 'tenant',
      query.scopeId || null
    );

    const bySeverity = {
      high: entries.filter(e => e.severity === 'high').length,
      medium: entries.filter(e => e.severity === 'medium').length,
      low: entries.filter(e => e.severity === 'low').length,
    };

    return success(entries, {
      totalCount: entries.length,
      bySeverity,
    });
  }
}
