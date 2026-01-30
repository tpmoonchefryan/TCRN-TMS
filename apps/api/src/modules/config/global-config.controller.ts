// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { GlobalConfigService } from './global-config.service';

// DTOs
class SetConfigDto {
  @IsNotEmpty()
  value: unknown;
}

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
  @ApiOperation({ summary: 'Get platform config by key' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
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
   * PUT /api/v1/platform/config/:key
   * Set platform config (AC tenant only)
   */
  @Put(':key')
  @ApiOperation({ summary: 'Set platform config (AC tenant only)' })
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
  @ApiOperation({ summary: 'List all platform configs (AC tenant only)' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    // Only AC tenant can list all configs
    this.checkAcTenantAccess(user);

    const configs = await this.globalConfigService.getAll();

    return success(configs);
  }
}
