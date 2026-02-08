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
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { SubsidiaryService } from './subsidiary.service';

// DTOs
class CreateSubsidiaryDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

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
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class UpdateSubsidiaryDto {
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
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsInt()
  @Min(1)
  version: number;
}

class MoveSubsidiaryDto {
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @IsInt()
  @Min(1)
  version: number;
}

class DeactivateSubsidiaryDto {
  @IsOptional()
  @IsBoolean()
  cascade?: boolean;

  @IsInt()
  @Min(1)
  version: number;
}

class ListSubsidiariesQueryDto {
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
  parentId?: string;

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

        return {
          id: sub.id,
          parentId: sub.parentId,
          code: sub.code,
          path: sub.path,
          depth: sub.depth,
          nameEn: sub.nameEn,
          nameZh: sub.nameZh,
          nameJa: sub.nameJa,
          name: getLocalizedName(sub),
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
        descriptionEn: dto.descriptionEn,
        descriptionZh: dto.descriptionZh,
        descriptionJa: dto.descriptionJa,
        sortOrder: dto.sortOrder,
      },
      user.id
    );

    return success({
      id: subsidiary.id,
      parentId: subsidiary.parentId,
      code: subsidiary.code,
      path: subsidiary.path,
      depth: subsidiary.depth,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      name: getLocalizedName(subsidiary),
      sortOrder: subsidiary.sortOrder,
      isActive: subsidiary.isActive,
      createdAt: subsidiary.createdAt.toISOString(),
      version: subsidiary.version,
    });
  }

  /**
   * GET /api/v1/subsidiaries/:id
   * Get subsidiary details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get subsidiary details' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const subsidiary = await this.subsidiaryService.findById(id, user.tenantSchema);
    if (!subsidiary) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Subsidiary not found' } };
    }

    const [childrenCount, talentCount] = await Promise.all([
      this.subsidiaryService.getChildrenCount(id, user.tenantSchema),
      this.subsidiaryService.getTalentCount(id, user.tenantSchema),
    ]);

    return success({
      id: subsidiary.id,
      parentId: subsidiary.parentId,
      code: subsidiary.code,
      path: subsidiary.path,
      depth: subsidiary.depth,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      name: getLocalizedName(subsidiary),
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
   * PATCH /api/v1/subsidiaries/:id
   * Update subsidiary
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update subsidiary' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubsidiaryDto,
  ) {
    const subsidiary = await this.subsidiaryService.update(
      id,
      user.tenantSchema,
      dto,
      user.id
    );

    return success({
      id: subsidiary.id,
      nameEn: subsidiary.nameEn,
      nameZh: subsidiary.nameZh,
      nameJa: subsidiary.nameJa,
      name: getLocalizedName(subsidiary),
      sortOrder: subsidiary.sortOrder,
      updatedAt: subsidiary.updatedAt.toISOString(),
      version: subsidiary.version,
    });
  }

  /**
   * POST /api/v1/subsidiaries/:id/move
   * Move subsidiary to new parent
   */
  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move subsidiary' })
  async move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveSubsidiaryDto,
  ) {
    const result = await this.subsidiaryService.move(
      id,
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
   * POST /api/v1/subsidiaries/:id/deactivate
   * Deactivate subsidiary
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate subsidiary' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeactivateSubsidiaryDto,
  ) {
    const result = await this.subsidiaryService.deactivate(
      id,
      user.tenantSchema,
      dto.cascade || false,
      dto.version,
      user.id
    );

    return success({
      id,
      isActive: false,
      cascadeAffected: {
        subsidiaries: result.subsidiaries,
        talents: result.talents,
      },
    });
  }

  /**
   * POST /api/v1/subsidiaries/:id/reactivate
   * Reactivate subsidiary
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate subsidiary' })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const subsidiary = await this.subsidiaryService.reactivate(
      id,
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
