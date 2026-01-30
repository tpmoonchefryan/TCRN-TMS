// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Controller,
    Get,
    Param,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { OrganizationService } from './organization.service';

// DTOs
class GetTreeQueryDto {
  @ApiPropertyOptional({ description: 'Include talents in tree nodes', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeTalents?: boolean;

  @ApiPropertyOptional({ description: 'Include inactive nodes', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Search keyword for filtering nodes', example: 'Tokyo' })
  @IsOptional()
  @IsString()
  search?: string;
}

class GetChildrenQueryDto {
  @ApiPropertyOptional({ description: 'Parent node ID (null for root)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Include talents in response', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeTalents?: boolean;

  @ApiPropertyOptional({ description: 'Include inactive nodes', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;
}

/**
 * Organization Controller
 * Provides organization tree and navigation
 */
@ApiTags('Org - Tree')
@Controller('organization')
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * GET /api/v1/organization/tree
   * Get organization tree
   */
  @Get('tree')
  @ApiOperation({ 
    summary: 'Get organization tree',
    description: `Returns the full organization tree structure including subsidiaries and talents.
    
The tree is filtered based on the authenticated user's access permissions.
Use this for initial page load. For lazy loading, use /tree/root and /tree/children.`,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns organization tree',
    schema: {
      example: {
        success: true,
        data: {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
          subsidiaries: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              code: 'TOKYO',
              displayName: 'Tokyo Branch',
              path: '/TOKYO/',
              talents: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440002',
                  code: 'TALENT001',
                  displayName: 'Talent Name',
                  avatarUrl: 'https://example.com/avatar.jpg',
                },
              ],
              children: [],
            },
          ],
          directTalents: [],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTree(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetTreeQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const tree = await this.organizationService.getTree(
      user.tenantId,
      user.tenantSchema,
      {
        includeTalents: query.includeTalents ?? true,
        includeInactive: query.includeInactive ?? false,
        search: query.search,
        language,
        userId: user.id, // Pass user ID for access filtering
      }
    );

    // Transform response to match frontend expected structure
    const transformNode = (node: any): any => ({
      id: node.id,
      code: node.code,
      displayName: node.name,
      parentId: null, // Will be set by parent
      path: node.path,
      talents: (node.talents || []).map((t: any) => ({
        id: t.id,
        code: t.code,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        subsidiaryId: node.id,
        subsidiaryName: node.name,
        path: `${node.path}${t.code}/`,
        homepagePath: t.homepagePath,
      })),
      children: (node.children || []).map(transformNode),
    });

    return success({
      tenantId: tree.tenant.id,
      subsidiaries: tree.tree.map(transformNode),
      directTalents: (tree.talentsWithoutSubsidiary || []).map((t: any) => ({
        id: t.id,
        code: t.code,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        subsidiaryId: null,
        path: `/${t.code}/`,
        homepagePath: t.homepagePath,
      })),
    });
  }

  /**
   * GET /api/v1/organization/tree/root
   * Get root level nodes only (for lazy loading)
   */
  @Get('tree/root')
  @ApiOperation({ summary: 'Get root level organization nodes (lazy load)' })
  async getRootNodes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetChildrenQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const result = await this.organizationService.getRootNodes(
      user.tenantId,
      user.tenantSchema,
      {
        includeTalents: query.includeTalents ?? true,
        includeInactive: query.includeInactive ?? false,
        language,
      }
    );

    return success({
      tenant: result.tenant,
      subsidiaries: result.subsidiaries.map(sub => ({
        id: sub.id,
        code: sub.code,
        displayName: sub.name,
        path: sub.path,
        depth: sub.depth,
        isActive: sub.isActive,
        hasChildren: sub.hasChildren,
        talentCount: sub.talentCount,
      })),
      directTalents: result.directTalents.map(t => ({
        id: t.id,
        code: t.code,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        homepagePath: t.homepagePath,
        isActive: t.isActive,
      })),
    });
  }

  /**
   * GET /api/v1/organization/tree/children
   * Get children of a parent node (for lazy loading)
   */
  @Get('tree/children')
  @ApiOperation({ summary: 'Get children of organization node (lazy load)' })
  async getChildren(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetChildrenQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const result = await this.organizationService.getChildren(
      user.tenantSchema,
      query.parentId || null,
      {
        includeTalents: query.includeTalents ?? true,
        includeInactive: query.includeInactive ?? false,
        language,
      }
    );

    return success({
      parentId: query.parentId || null,
      subsidiaries: result.subsidiaries.map(sub => ({
        id: sub.id,
        code: sub.code,
        displayName: sub.name,
        path: sub.path,
        depth: sub.depth,
        isActive: sub.isActive,
        hasChildren: sub.hasChildren,
        talentCount: sub.talentCount,
      })),
      talents: result.talents.map(t => ({
        id: t.id,
        code: t.code,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        homepagePath: t.homepagePath,
        isActive: t.isActive,
      })),
    });
  }

  /**
   * GET /api/v1/organization/path/:path
   * Get node info by path
   */
  @Get('path/*subpath')
  @ApiOperation({ summary: 'Get node by path' })
  async getByPath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subpath') pathParam: string,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';
    const path = '/' + pathParam + (pathParam.endsWith('/') ? '' : '/');

    const breadcrumb = await this.organizationService.getBreadcrumb(
      user.tenantId,
      user.tenantSchema,
      path,
      language
    );

    // The last item in breadcrumb is the current node
    const current = breadcrumb[breadcrumb.length - 1];

    return success({
      current,
      breadcrumb,
    });
  }
}
