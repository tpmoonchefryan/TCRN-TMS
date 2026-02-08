// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { TalentService } from './talent.service';

// DTOs
class CreateTalentDto {
  @IsOptional()
  @IsString()
  subsidiaryId?: string | null;

  @IsUUID()
  profileStoreId: string;

  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @IsString()
  @MinLength(1)
  nameEn: string;

  @IsOptional()
  @IsString()
  nameZh?: string;

  @IsOptional()
  @IsString()
  nameJa?: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Homepage path must be lowercase letters, numbers, and hyphens only' })
  homepagePath?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

class UpdateTalentDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameZh?: string;

  @IsOptional()
  @IsString()
  nameJa?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  homepagePath?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  socialLinks?: Array<{ platform: string; url: string; label?: string }>;

  @IsInt()
  @Min(1)
  version: number;
}

class MoveTalentDto {
  @IsOptional()
  @IsString()
  newSubsidiaryId?: string | null;

  @IsInt()
  @Min(1)
  version: number;
}

class ListTalentsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  subsidiaryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sort?: string;
}

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

    const enrichedData = data.map((talent) => ({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      code: talent.code,
      path: talent.path,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      name: getLocalizedName(talent),
      displayName: talent.displayName,
      avatarUrl: talent.avatarUrl,
      homepagePath: talent.homepagePath,
      timezone: talent.timezone,
      isActive: talent.isActive,
      createdAt: talent.createdAt.toISOString(),
      updatedAt: talent.updatedAt.toISOString(),
      version: talent.version,
    }));

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

    return success({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      code: talent.code,
      path: talent.path,
      nameEn: talent.nameEn,
      name: getLocalizedName(talent),
      displayName: talent.displayName,
      avatarUrl: talent.avatarUrl,
      homepagePath: talent.homepagePath,
      timezone: talent.timezone,
      isActive: talent.isActive,
      createdAt: talent.createdAt.toISOString(),
      version: talent.version,
    });
  }

  /**
   * GET /api/v1/talents/:id
   * Get talent details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get talent details' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const talent = await this.talentService.findById(id, user.tenantSchema);
    if (!talent) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Talent not found' } };
    }

    // Get talent statistics, external pages domain config, and profile store info
    const [stats, externalPagesDomain, profileStore] = await Promise.all([
      this.talentService.getTalentStats(id, user.tenantSchema),
      this.talentService.getExternalPagesDomainConfig(id, user.tenantSchema),
      talent.profileStoreId 
        ? this.talentService.getProfileStoreById(talent.profileStoreId, user.tenantSchema)
        : null,
    ]);

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
        isDefault: profileStore.isDefault,
        piiProxyUrl: profileStore.piiProxyUrl,
      } : null,
      code: talent.code,
      path: talent.path,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      name: getLocalizedName(talent),
      displayName: talent.displayName,
      descriptionEn: talent.descriptionEn,
      descriptionZh: talent.descriptionZh,
      descriptionJa: talent.descriptionJa,
      avatarUrl: talent.avatarUrl,
      homepagePath: talent.homepagePath,
      timezone: talent.timezone,
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
   * PATCH /api/v1/talents/:id
   * Update talent
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update talent' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTalentDto,
  ) {
    const talent = await this.talentService.update(
      id,
      user.tenantSchema,
      dto,
      user.id
    );

    return success({
      id: talent.id,
      nameEn: talent.nameEn,
      nameZh: talent.nameZh,
      nameJa: talent.nameJa,
      name: getLocalizedName(talent),
      displayName: talent.displayName,
      homepagePath: talent.homepagePath,
      updatedAt: talent.updatedAt.toISOString(),
      version: talent.version,
    });
  }

  /**
   * POST /api/v1/talents/:id/move
   * Move talent to new subsidiary
   */
  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move talent' })
  async move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveTalentDto,
  ) {
    const talent = await this.talentService.move(
      id,
      user.tenantSchema,
      dto.newSubsidiaryId ?? null,
      dto.version,
      user.id
    );

    return success({
      id: talent.id,
      subsidiaryId: talent.subsidiaryId,
      path: talent.path,
      version: talent.version,
    });
  }

  /**
   * POST /api/v1/talents/:id/deactivate
   * Deactivate talent
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate talent' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const talent = await this.talentService.deactivate(
      id,
      user.tenantSchema,
      body.version,
      user.id
    );

    return success({
      id: talent.id,
      isActive: false,
      version: talent.version,
    });
  }

  /**
   * POST /api/v1/talents/:id/reactivate
   * Reactivate talent
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate talent' })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const talent = await this.talentService.reactivate(
      id,
      user.tenantSchema,
      body.version,
      user.id
    );

    return success({
      id: talent.id,
      isActive: true,
      version: talent.version,
    });
  }

  // =============================================================================
  // UNIFIED CUSTOM DOMAIN MANAGEMENT
  // =============================================================================

  /**
   * GET /api/v1/talents/:id/custom-domain
   * Get custom domain configuration
   */
  @Get(':id/custom-domain')
  @ApiOperation({ summary: 'Get custom domain configuration' })
  async getCustomDomainConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const config = await this.talentService.getCustomDomainConfig(id, user.tenantSchema);
    if (!config) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Talent not found' } };
    }
    return success(config);
  }

  /**
   * POST /api/v1/talents/:id/custom-domain
   * Set custom domain
   */
  @Post(':id/custom-domain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set custom domain' })
  async setCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { customDomain: string | null },
  ) {
    const result = await this.talentService.setCustomDomain(
      id,
      user.tenantSchema,
      body.customDomain
    );
    return success(result);
  }

  /**
   * POST /api/v1/talents/:id/custom-domain/verify
   * Verify custom domain
   */
  @Post(':id/custom-domain/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify custom domain' })
  async verifyCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const result = await this.talentService.verifyCustomDomain(id, user.tenantSchema);
    return success(result);
  }

  /**
   * PATCH /api/v1/talents/:id/custom-domain/paths
   * Update service paths for custom domain
   */
  @Patch(':id/custom-domain/paths')
  @ApiOperation({ summary: 'Update custom domain service paths' })
  async updateServicePaths(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { homepageCustomPath?: string; marshmallowCustomPath?: string },
  ) {
    const result = await this.talentService.updateServicePaths(
      id,
      user.tenantSchema,
      body
    );
    return success(result);
  }

  /**
   * PATCH /api/v1/talents/:id/custom-domain/ssl-mode
   * Update SSL mode for custom domain
   */
  @Patch(':id/custom-domain/ssl-mode')
  @ApiOperation({ summary: 'Update custom domain SSL mode' })
  async updateSslMode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { sslMode: 'auto' | 'self_hosted' | 'cloudflare' },
  ) {
    const result = await this.talentService.updateSslMode(
      id,
      user.tenantSchema,
      body.sslMode
    );
    return success(result);
  }
}
