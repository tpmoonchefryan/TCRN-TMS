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
import { IsInt, IsObject, IsString, Min } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
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

  /**
   * GET /api/v1/subsidiaries/:subsidiaryId/settings
   * Get subsidiary settings (with inheritance)
   */
  @Get('subsidiaries/:subsidiaryId/settings')
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
