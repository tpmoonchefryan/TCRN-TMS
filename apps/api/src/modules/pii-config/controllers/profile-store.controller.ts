// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    CreateProfileStoreDto,
    PaginationQueryDto,
    UpdateProfileStoreDto,
} from '../dto/pii-config.dto';
import { ProfileStoreService } from '../services/profile-store.service';

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

const PROFILE_STORE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
    code: { type: 'string', example: 'DEFAULT_STORE' },
    name: { type: 'string', example: 'Default Profile Store' },
    nameZh: { type: 'string', nullable: true, example: '默认档案库' },
    nameJa: { type: 'string', nullable: true, example: 'デフォルトプロフィールストア' },
    talentCount: { type: 'integer', example: 3 },
    customerCount: { type: 'integer', example: 1200 },
    isDefault: { type: 'boolean', example: true },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: ['id', 'code', 'name', 'talentCount', 'customerCount', 'isDefault', 'isActive', 'createdAt', 'version'],
};

const PROFILE_STORE_LIST_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      items: { type: 'array', items: PROFILE_STORE_ITEM_SCHEMA },
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
    required: ['items', 'meta'],
  },
  {
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440600',
        code: 'DEFAULT_STORE',
        name: 'Default Profile Store',
        nameZh: '默认档案库',
        nameJa: 'デフォルトプロフィールストア',
        talentCount: 3,
        customerCount: 1200,
        isDefault: true,
        isActive: true,
        createdAt: '2026-04-13T08:00:00.000Z',
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
);

const PROFILE_STORE_DETAIL_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      ...PROFILE_STORE_ITEM_SCHEMA.properties,
      description: { type: 'string', nullable: true, example: 'Primary customer profile store' },
      descriptionZh: { type: 'string', nullable: true, example: '主要客户档案库' },
      descriptionJa: { type: 'string', nullable: true, example: '主要な顧客プロフィールストア' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    },
    required: [...(PROFILE_STORE_ITEM_SCHEMA.required as string[]), 'description', 'updatedAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440600',
    code: 'DEFAULT_STORE',
    name: 'Default Profile Store',
    nameZh: '默认档案库',
    nameJa: 'デフォルトプロフィールストア',
    description: 'Primary customer profile store',
    descriptionZh: '主要客户档案库',
    descriptionJa: '主要な顧客プロフィールストア',
    talentCount: 3,
    customerCount: 1200,
    isDefault: true,
    isActive: true,
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const PROFILE_STORE_CREATE_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
      code: { type: 'string', example: 'DEFAULT_STORE' },
      name: { type: 'string', example: 'Default Profile Store' },
      isDefault: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    },
    required: ['id', 'code', 'name', 'isDefault', 'createdAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440600',
    code: 'DEFAULT_STORE',
    name: 'Default Profile Store',
    isDefault: true,
    createdAt: '2026-04-13T08:00:00.000Z',
  },
);

const PROFILE_STORE_UPDATE_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
      code: { type: 'string', example: 'DEFAULT_STORE' },
      version: { type: 'integer', example: 2 },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:15:00.000Z' },
    },
    required: ['id', 'code', 'version', 'updatedAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440600',
    code: 'DEFAULT_STORE',
    version: 2,
    updatedAt: '2026-04-13T09:15:00.000Z',
  },
);

const PROFILE_STORE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Profile store request is invalid',
);

const PROFILE_STORE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const PROFILE_STORE_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

const PROFILE_STORE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Profile store not found',
);

const PROFILE_STORE_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified by another user',
);

@ApiTags('System - PII')
@ApiBearerAuth()
@Controller('profile-stores')
export class ProfileStoreController {
  constructor(
    private readonly profileStoreService: ProfileStoreService,
  ) {}

  /**
   * List profile stores
   */
  @Get()
  @RequirePermissions({ resource: 'config.profile_store', action: 'read' })
  @ApiOperation({ summary: 'List profile stores' })
  @ApiResponse({ status: 200, description: 'Returns profile store list', schema: PROFILE_STORE_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list profile stores', schema: PROFILE_STORE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list profile stores', schema: PROFILE_STORE_FORBIDDEN_SCHEMA })
  async list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.findMany(query, context);
  }

  /**
   * Get profile store by ID
   */
  @Get(':id')
  @RequirePermissions({ resource: 'config.profile_store', action: 'read' })
  @ApiOperation({ summary: 'Get profile store' })
  @ApiParam({
    name: 'id',
    description: 'Profile-store identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns profile store detail', schema: PROFILE_STORE_DETAIL_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read profile stores', schema: PROFILE_STORE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read profile stores', schema: PROFILE_STORE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Profile store was not found', schema: PROFILE_STORE_NOT_FOUND_SCHEMA })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.findById(id, context);
  }

  /**
   * Create profile store
   */
  @Post()
  @RequirePermissions({ resource: 'config.profile_store', action: 'create' })
  @ApiOperation({ summary: 'Create profile store' })
  @ApiResponse({ status: 201, description: 'Profile store created', schema: PROFILE_STORE_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Profile-store payload is invalid', schema: PROFILE_STORE_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create profile stores', schema: PROFILE_STORE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create profile stores', schema: PROFILE_STORE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Referenced PII service config was not found', schema: PROFILE_STORE_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Profile store code already exists', schema: createErrorEnvelopeSchema(ErrorCodes.RES_ALREADY_EXISTS, 'Profile store with this code already exists') })
  async create(
    @Body() dto: CreateProfileStoreDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.create(dto, context);
  }

  /**
   * Update profile store
   */
  @Patch(':id')
  @RequirePermissions({ resource: 'config.profile_store', action: 'update' })
  @ApiOperation({ summary: 'Update profile store' })
  @ApiParam({
    name: 'id',
    description: 'Profile-store identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Profile store updated', schema: PROFILE_STORE_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Profile-store update is invalid', schema: PROFILE_STORE_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update profile stores', schema: PROFILE_STORE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update profile stores', schema: PROFILE_STORE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Profile store or referenced PII service config was not found', schema: PROFILE_STORE_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Profile-store update conflicted with current stored version', schema: PROFILE_STORE_CONFLICT_SCHEMA })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileStoreDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.update(id, dto, context);
  }

  /**
   * Build request context
   */
  private buildContext(
    user: { id: string; username: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
