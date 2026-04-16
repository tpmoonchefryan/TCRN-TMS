// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { RequirePlatformConfigPermission } from './config-rbac';
import { GlobalConfigService } from './global-config.service';

// DTOs
export class SetConfigDto {
  @ApiProperty({
    description: 'JSON value to store for the specified platform config key',
    example: { domain: 'tcrn.app' },
  })
  @IsNotEmpty()
  value: unknown;
}

const GLOBAL_CONFIG_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', example: 'system.baseDomain' },
    value: {
      type: 'object',
      additionalProperties: true,
      example: { domain: 'tcrn.app' },
    },
    description: {
      type: 'string',
      nullable: true,
      example: 'Base domain for system subdomains (e.g., tcrn.app)',
    },
  },
  required: ['key', 'value'],
} as const;

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
    error: {
      code,
      message,
    },
  },
});

const GLOBAL_CONFIG_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(GLOBAL_CONFIG_ITEM_SCHEMA, {
  key: 'system.baseDomain',
  value: { domain: 'tcrn.app' },
  description: 'Base domain for system subdomains (e.g., tcrn.app)',
});

const GLOBAL_CONFIG_LIST_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: GLOBAL_CONFIG_ITEM_SCHEMA,
  },
  [
    {
      key: 'system.baseDomain',
      value: { domain: 'tcrn.app' },
      description: 'Base domain for system subdomains (e.g., tcrn.app)',
    },
  ],
);

const GLOBAL_CONFIG_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'VALIDATION_FAILED',
  'Config value is required',
);

const GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const GLOBAL_CONFIG_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_FORBIDDEN',
  'You do not have permission to access platform config',
);

const GLOBAL_CONFIG_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  'CONFIG_NOT_FOUND',
  "Config 'system.baseDomain' not found",
);

/**
 * Platform Config Controller
 * For AC tenant admin to manage global platform configuration
 * Route: /api/v1/platform/config
 */
@ApiTags('System - Config')
@Controller('platform/config')
@ApiBearerAuth()
export class GlobalConfigController {
  constructor(private readonly globalConfigService: GlobalConfigService) {}

  /**
   * Check if user is AC tenant admin
   */
  private checkAcTenantAccess(user: AuthenticatedUser): void {
    // AC tenant has schema 'tenant_ac'
    if (user.tenantSchema !== 'tenant_ac') {
      throw new ForbiddenException({
        code: 'AC_TENANT_ONLY',
        message: 'This operation is only available for AC tenant administrators',
      });
    }
  }

  /**
   * GET /api/v1/platform/config/:key
   * Get platform config by key
   */
  @Get(':key')
  @RequirePlatformConfigPermission('read')
  @ApiOperation({ summary: 'Get platform config by key' })
  @ApiParam({
    name: 'key',
    description: 'Platform config key',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested platform config',
    schema: GLOBAL_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to access platform config',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission to read platform config',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Requested platform config key was not found',
    schema: GLOBAL_CONFIG_NOT_FOUND_SCHEMA,
  })
  async get(
    @Param('key') key: string,
  ) {
    // Any authenticated user can read config
    const config = await this.globalConfigService.get(key);

    if (!config) {
      throw new NotFoundException({
        code: 'CONFIG_NOT_FOUND',
        message: `Config '${key}' not found`,
      });
    }

    return success(config);
  }

  /**
   * PATCH /api/v1/platform/config/:key
   * Set platform config (AC tenant only)
   */
  @Patch(':key')
  @RequirePlatformConfigPermission('write')
  @ApiOperation({ summary: 'Set platform config (AC tenant only)' })
  @ApiParam({
    name: 'key',
    description: 'Platform config key',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated platform config',
    schema: GLOBAL_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Config payload validation failed',
    schema: GLOBAL_CONFIG_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update platform config',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission or is not in the AC tenant',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  async set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: SetConfigDto,
  ) {
    // Only AC tenant can modify global config
    this.checkAcTenantAccess(user);

    const config = await this.globalConfigService.set(key, dto.value);

    return success(config);
  }

  /**
   * GET /api/v1/platform/config
   * List all platform configs (AC tenant only)
   */
  @Get()
  @RequirePlatformConfigPermission('admin')
  @ApiOperation({ summary: 'List all platform configs (AC tenant only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns all platform config entries',
    schema: GLOBAL_CONFIG_LIST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list platform config entries',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission or is not in the AC tenant',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  async list(@CurrentUser() user: AuthenticatedUser) {
    // Only AC tenant can list all configs
    this.checkAcTenantAccess(user);

    const configs = await this.globalConfigService.getAll();

    return success(configs);
  }
}
