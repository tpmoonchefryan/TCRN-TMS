// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../common/decorators';
import { success } from '../../common/response.util';
import { ScopeSettings, SettingsService } from './settings.service';

// DTOs
export class UpdateSettingsDto {
  @ApiProperty({ description: 'Settings object to update', example: { defaultLanguage: 'ja', maxItems: 100 } })
  @IsObject()
  settings: Record<string, unknown>;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version: number;
}

export class ResetFieldDto {
  @ApiProperty({ description: 'Field name to reset', example: 'defaultLanguage' })
  @IsString()
  field: string;
}

export class UpdateTenantTurnstileSettingsDto {
  @ApiProperty({
    description: 'Tenant Cloudflare Turnstile Site Key. Empty or null clears the tenant-owned site key.',
    example: '0x4AAAAAAABBBBBBBBBBBBBB',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  siteKey?: string | null;

  @ApiProperty({
    description: 'Explicit Secret Key mutation. Empty string never clears a secret.',
    enum: ['keep', 'replace', 'clear'],
    example: 'replace',
    required: false,
  })
  @IsOptional()
  @IsIn(['keep', 'replace', 'clear'])
  secretKeyMutation?: 'keep' | 'replace' | 'clear';

  @ApiProperty({
    description: 'New Cloudflare Turnstile Secret Key. Only accepted when secretKeyMutation is replace.',
    example: '0x4AAAAAAASECRET',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  secretKey?: string | null;
}

const SETTINGS_DATA_SCHEMA = {
  type: 'object',
  properties: {
    scopeType: {
      type: 'string',
      enum: ['tenant', 'subsidiary', 'talent'],
      example: 'talent',
    },
    scopeId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
    settings: {
      type: 'object',
      additionalProperties: true,
      example: {
        defaultLanguage: 'ja',
        timezone: 'Asia/Tokyo',
        allowCustomHomepage: true,
      },
    },
    overrides: {
      type: 'array',
      items: { type: 'string' },
      example: ['timezone'],
    },
    inheritedFrom: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        defaultLanguage: 'tenant',
        currency: 'default',
      },
    },
    version: {
      type: 'integer',
      example: 2,
    },
  },
  required: ['scopeType', 'scopeId', 'settings', 'overrides', 'inheritedFrom', 'version'],
} as const;

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: Record<string, unknown>) => ({
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

const createErrorEnvelopeSchema = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
        ...(details
          ? {
              details: {
                type: 'object',
                additionalProperties: true,
                example: details,
              },
            }
          : {}),
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
      ...(details ? { details } : {}),
    },
  },
});

const SETTINGS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(SETTINGS_DATA_SCHEMA, {
  scopeType: 'talent',
  scopeId: '550e8400-e29b-41d4-a716-446655440000',
  settings: {
    defaultLanguage: 'ja',
    timezone: 'Asia/Tokyo',
    allowCustomHomepage: true,
  },
  overrides: ['timezone'],
  inheritedFrom: {
    defaultLanguage: 'tenant',
    allowCustomHomepage: 'default',
  },
  version: 2,
});

const SETTINGS_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'VALIDATION_FAILED',
  'Settings have been modified by another user',
  { version: ['Expected the latest settings version before updating'] },
);

const SETTINGS_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const SETTINGS_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  'RES_NOT_FOUND',
  'Requested scope was not found',
);

const TURNSTILE_SETTINGS_DATA_SCHEMA = {
  type: 'object',
  properties: {
    siteKey: { type: 'string', nullable: true, example: '0x4AAAAAAABBBBBBBBBBBBBB' },
    effectiveSiteKey: { type: 'string', nullable: true, example: '0x4AAAAAAABBBBBBBBBBBBBB' },
    source: { type: 'string', enum: ['tenant', 'environment', 'none'], example: 'tenant' },
    environment: { type: 'string', enum: ['development', 'test', 'staging', 'production'], example: 'staging' },
    siteKeyConfigured: { type: 'boolean', example: true },
    secretKeyConfigured: { type: 'boolean', example: true },
    providerReady: { type: 'boolean', example: true },
    runtimeBypass: { type: 'boolean', example: false },
    ready: { type: 'boolean', example: true },
    secretKeyMasked: { type: 'string', nullable: true, example: '********' },
  },
  required: [
    'siteKey',
    'effectiveSiteKey',
    'source',
    'environment',
    'siteKeyConfigured',
    'secretKeyConfigured',
    'providerReady',
    'runtimeBypass',
    'ready',
    'secretKeyMasked',
  ],
} as const;

const TURNSTILE_SETTINGS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  TURNSTILE_SETTINGS_DATA_SCHEMA,
  {
    siteKey: '0x4AAAAAAABBBBBBBBBBBBBB',
    effectiveSiteKey: '0x4AAAAAAABBBBBBBBBBBBBB',
    source: 'tenant',
    environment: 'staging',
    siteKeyConfigured: true,
    secretKeyConfigured: true,
    providerReady: true,
    runtimeBypass: false,
    ready: true,
    secretKeyMasked: '********',
  },
);

/**
 * Settings Controller
 * Manages hierarchical settings for tenant, subsidiary, and talent
 */
@ApiTags('System - Settings')
@Controller()
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/organization/settings
   * Get tenant-level settings
   */
  @Get('organization/settings')
  @RequirePermissions({ resource: 'settings', action: 'read' })
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns effective tenant settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read tenant settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  async getTenantSettings(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const settings = await this.settingsService.getEffectiveSettings(
      user.tenantSchema,
      'tenant',
      null
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PATCH /api/v1/organization/settings
   * Update tenant-level settings
   */
  @Patch('organization/settings')
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns updated tenant settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed or optimistic-lock version mismatched',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update tenant settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  async updateTenantSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(
      user.tenantSchema,
      'tenant',
      null,
      dto.settings,
      dto.version,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  @Get('organization/settings/turnstile')
  @RequirePermissions({ resource: 'config.platform_settings', action: 'read' })
  @ApiOperation({ summary: 'Get tenant Cloudflare Turnstile settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns tenant-owned Turnstile settings and non-secret effective readiness',
    schema: TURNSTILE_SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read tenant Turnstile settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  async getTenantTurnstileSettings(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return success(await this.settingsService.getTenantTurnstileSettings(user.tenantSchema));
  }

  @Patch('organization/settings/turnstile')
  @RequirePermissions({ resource: 'config.platform_settings', action: 'update' })
  @ApiOperation({ summary: 'Update tenant Cloudflare Turnstile settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns updated tenant Turnstile settings without exposing Secret Key',
    schema: TURNSTILE_SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update tenant Turnstile settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  async updateTenantTurnstileSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantTurnstileSettingsDto,
  ) {
    return success(await this.settingsService.updateTenantTurnstileSettings(user.tenantSchema, dto));
  }

  /**
   * GET /api/v1/subsidiaries/:subsidiaryId/settings
   * Get subsidiary settings (with inheritance)
   */
  @Get('subsidiaries/:subsidiaryId/settings')
  @RequirePermissions({ resource: 'settings', action: 'read' })
  @ApiOperation({ summary: 'Get subsidiary settings' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns effective subsidiary settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read subsidiary settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async getSubsidiarySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
  ) {
    const settings = await this.settingsService.getEffectiveSettings(
      user.tenantSchema,
      'subsidiary',
      subsidiaryId
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PATCH /api/v1/subsidiaries/:subsidiaryId/settings
   * Update subsidiary settings
   */
  @Patch('subsidiaries/:subsidiaryId/settings')
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: 'Update subsidiary settings' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated subsidiary settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed or optimistic-lock version mismatched',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update subsidiary settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async updateSubsidiarySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(
      user.tenantSchema,
      'subsidiary',
      subsidiaryId,
      dto.settings,
      dto.version,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PATCH /api/v1/subsidiaries/:subsidiaryId/settings/reset
   * Reset a subsidiary setting field to inherited value
   */
  @Patch('subsidiaries/:subsidiaryId/settings/reset')
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: 'Reset subsidiary setting to inherited value' })
  @ApiParam({
    name: 'subsidiaryId',
    description: 'Subsidiary identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns effective subsidiary settings after reset',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reset subsidiary settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Subsidiary was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async resetSubsidiarySetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: ResetFieldDto,
  ) {
    const settings = await this.settingsService.resetToInherited(
      user.tenantSchema,
      'subsidiary',
      subsidiaryId,
      dto.field,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * GET /api/v1/talents/:talentId/settings
   * Get talent settings (with inheritance)
   */
  @Get('talents/:talentId/settings')
  @RequirePermissions({ resource: 'settings', action: 'read' })
  @ApiOperation({ summary: 'Get talent settings' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns effective talent settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read talent settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async getTalentSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
  ) {
    const settings = await this.settingsService.getEffectiveSettings(
      user.tenantSchema,
      'talent',
      talentId
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PATCH /api/v1/talents/:talentId/settings
   * Update talent settings
   */
  @Patch('talents/:talentId/settings')
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: 'Update talent settings' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated talent settings',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed or optimistic-lock version mismatched',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update talent settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async updateTalentSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(
      user.tenantSchema,
      'talent',
      talentId,
      dto.settings,
      dto.version,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PATCH /api/v1/talents/:talentId/settings/reset
   * Reset a talent setting field to inherited value
   */
  @Patch('talents/:talentId/settings/reset')
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: 'Reset talent setting to inherited value' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns effective talent settings after reset',
    schema: SETTINGS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Request validation failed',
    schema: SETTINGS_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reset talent settings',
    schema: SETTINGS_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Talent was not found in the current tenant',
    schema: SETTINGS_NOT_FOUND_SCHEMA,
  })
  async resetTalentSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: ResetFieldDto,
  ) {
    const settings = await this.settingsService.resetToInherited(
      user.tenantSchema,
      'talent',
      talentId,
      dto.field,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * Format settings response
   */
  private formatSettingsResponse(settings: ScopeSettings) {
    return {
      scopeType: settings.scopeType,
      scopeId: settings.scopeId,
      settings: settings.settings,
      overrides: settings.overrides,
      inheritedFrom: settings.inheritedFrom,
      version: settings.version,
    };
  }
}
