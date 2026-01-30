// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Param,
    Put
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsString, Min } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { ScopeSettings, SettingsService } from './settings.service';

// DTOs
class UpdateSettingsDto {
  @ApiProperty({ description: 'Settings object to update', example: { defaultLanguage: 'ja', maxItems: 100 } })
  @IsObject()
  settings: Record<string, unknown>;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version: number;
}

class ResetFieldDto {
  @ApiProperty({ description: 'Field name to reset', example: 'defaultLanguage' })
  @IsString()
  field: string;
}

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
   * PUT /api/v1/organization/settings
   * Update tenant-level settings
   */
  @Put('organization/settings')
  @ApiOperation({ summary: 'Update tenant settings' })
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
   * GET /api/v1/subsidiaries/:id/settings
   * Get subsidiary settings (with inheritance)
   */
  @Get('subsidiaries/:id/settings')
  @ApiOperation({ summary: 'Get subsidiary settings' })
  async getSubsidiarySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const settings = await this.settingsService.getEffectiveSettings(
      user.tenantSchema,
      'subsidiary',
      id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PUT /api/v1/subsidiaries/:id/settings
   * Update subsidiary settings
   */
  @Put('subsidiaries/:id/settings')
  @ApiOperation({ summary: 'Update subsidiary settings' })
  async updateSubsidiarySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(
      user.tenantSchema,
      'subsidiary',
      id,
      dto.settings,
      dto.version,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PUT /api/v1/subsidiaries/:id/settings/reset
   * Reset a subsidiary setting field to inherited value
   */
  @Put('subsidiaries/:id/settings/reset')
  @ApiOperation({ summary: 'Reset subsidiary setting to inherited value' })
  async resetSubsidiarySetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResetFieldDto,
  ) {
    const settings = await this.settingsService.resetToInherited(
      user.tenantSchema,
      'subsidiary',
      id,
      dto.field,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * GET /api/v1/talents/:id/settings
   * Get talent settings (with inheritance)
   */
  @Get('talents/:id/settings')
  @ApiOperation({ summary: 'Get talent settings' })
  async getTalentSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const settings = await this.settingsService.getEffectiveSettings(
      user.tenantSchema,
      'talent',
      id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PUT /api/v1/talents/:id/settings
   * Update talent settings
   */
  @Put('talents/:id/settings')
  @ApiOperation({ summary: 'Update talent settings' })
  async updateTalentSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const settings = await this.settingsService.updateSettings(
      user.tenantSchema,
      'talent',
      id,
      dto.settings,
      dto.version,
      user.id
    );

    return success(this.formatSettingsResponse(settings));
  }

  /**
   * PUT /api/v1/talents/:id/settings/reset
   * Reset a talent setting field to inherited value
   */
  @Put('talents/:id/settings/reset')
  @ApiOperation({ summary: 'Reset talent setting to inherited value' })
  async resetTalentSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResetFieldDto,
  ) {
    const settings = await this.settingsService.resetToInherited(
      user.tenantSchema,
      'talent',
      id,
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
