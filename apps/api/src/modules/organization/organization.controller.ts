// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import type { TalentSummary, TreeNode } from './organization.service';
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

interface OrganizationTreeTalentResponse {
  id: string;
  code: string;
  displayName: string;
  avatarUrl: string | null;
  subsidiaryId: string | null;
  subsidiaryName?: string;
  path: string;
  homepagePath: string | null;
  lifecycleStatus: TalentSummary['lifecycleStatus'];
  publishedAt: string | null;
  isActive: boolean;
}

interface OrganizationTreeSubsidiaryResponse {
  id: string;
  code: string;
  displayName: string;
  parentId: string | null;
  path: string;
  talents: OrganizationTreeTalentResponse[];
  children: OrganizationTreeSubsidiaryResponse[];
}

const mapTreeTalent = (
  talent: TalentSummary,
  options: {
    subsidiaryId: string | null;
    subsidiaryName?: string;
    path: string;
  }
): OrganizationTreeTalentResponse => ({
  id: talent.id,
  code: talent.code,
  displayName: talent.displayName,
  avatarUrl: talent.avatarUrl,
  subsidiaryId: options.subsidiaryId,
  subsidiaryName: options.subsidiaryName,
  path: options.path,
  homepagePath: talent.homepagePath,
  lifecycleStatus: talent.lifecycleStatus,
  publishedAt: talent.publishedAt?.toISOString() ?? null,
  isActive: talent.isActive,
});

const mapTreeNode = (
  node: TreeNode,
  parentId: string | null = null
): OrganizationTreeSubsidiaryResponse => ({
  id: node.id,
  code: node.code,
  displayName: node.name,
  parentId,
  path: node.path,
  talents: (node.talents ?? []).map((talent) =>
    mapTreeTalent(talent, {
      subsidiaryId: node.id,
      subsidiaryName: node.name,
      path: `${node.path}${talent.code}/`,
    })
  ),
  children: node.children.map((child) => mapTreeNode(child, node.id)),
});

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

const ORGANIZATION_TREE_TALENT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
    code: { type: 'string', example: 'SORA' },
    displayName: { type: 'string', example: 'Sora' },
    avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar/sora.jpg' },
    subsidiaryId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440100' },
    subsidiaryName: { type: 'string', nullable: true, example: 'Tokyo Branch' },
    path: { type: 'string', example: '/TOKYO/SORA/' },
    homepagePath: { type: 'string', nullable: true, example: 'sora' },
    lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'published' },
    publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    isActive: { type: 'boolean', example: true },
  },
  required: ['id', 'code', 'displayName', 'avatarUrl', 'subsidiaryId', 'path', 'homepagePath', 'lifecycleStatus', 'publishedAt', 'isActive'],
};

const ORGANIZATION_TREE_SUBSIDIARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    code: { type: 'string', example: 'TOKYO' },
    displayName: { type: 'string', example: 'Tokyo Branch' },
    parentId: { type: 'string', format: 'uuid', nullable: true, example: null },
    path: { type: 'string', example: '/TOKYO/' },
    talents: {
      type: 'array',
      items: ORGANIZATION_TREE_TALENT_SCHEMA,
    },
    children: {
      type: 'array',
      items: {},
    },
  },
  required: ['id', 'code', 'displayName', 'parentId', 'path', 'talents', 'children'],
};
ORGANIZATION_TREE_SUBSIDIARY_SCHEMA.properties = {
  ...(ORGANIZATION_TREE_SUBSIDIARY_SCHEMA.properties as Record<string, unknown>),
  children: {
    type: 'array',
    items: ORGANIZATION_TREE_SUBSIDIARY_SCHEMA,
  },
};

const ORGANIZATION_TREE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      tenantId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      subsidiaries: {
        type: 'array',
        items: ORGANIZATION_TREE_SUBSIDIARY_SCHEMA,
      },
      directTalents: {
        type: 'array',
        items: ORGANIZATION_TREE_TALENT_SCHEMA,
      },
    },
    required: ['tenantId', 'subsidiaries', 'directTalents'],
  },
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    subsidiaries: [
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        code: 'TOKYO',
        displayName: 'Tokyo Branch',
        parentId: null,
        path: '/TOKYO/',
        talents: [
          {
            id: '550e8400-e29b-41d4-a716-446655440300',
            code: 'SORA',
            displayName: 'Sora',
            avatarUrl: 'https://cdn.tcrn.app/avatar/sora.jpg',
            subsidiaryId: '550e8400-e29b-41d4-a716-446655440100',
            subsidiaryName: 'Tokyo Branch',
            path: '/TOKYO/SORA/',
            homepagePath: 'sora',
            lifecycleStatus: 'published',
            publishedAt: '2026-04-13T09:00:00.000Z',
            isActive: true,
          },
        ],
        children: [],
      },
    ],
    directTalents: [],
  },
);

const ORGANIZATION_CHILD_NODE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    code: { type: 'string', example: 'TOKYO' },
    displayName: { type: 'string', example: 'Tokyo Branch' },
    path: { type: 'string', example: '/TOKYO/' },
    depth: { type: 'integer', example: 1 },
    isActive: { type: 'boolean', example: true },
    hasChildren: { type: 'boolean', example: true },
    talentCount: { type: 'integer', example: 5 },
  },
  required: ['id', 'code', 'displayName', 'path', 'depth', 'isActive', 'hasChildren', 'talentCount'],
};

const ORGANIZATION_ROOT_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          code: { type: 'string', example: 'TENANT' },
          name: { type: 'string', example: 'Tenant' },
        },
        required: ['id', 'code', 'name'],
      },
      subsidiaries: {
        type: 'array',
        items: ORGANIZATION_CHILD_NODE_SCHEMA,
      },
      directTalents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
            code: { type: 'string', example: 'SORA' },
            displayName: { type: 'string', example: 'Sora' },
            avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar/sora.jpg' },
            homepagePath: { type: 'string', nullable: true, example: 'sora' },
            lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'published' },
            publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
            isActive: { type: 'boolean', example: true },
          },
          required: ['id', 'code', 'displayName', 'avatarUrl', 'homepagePath', 'lifecycleStatus', 'publishedAt', 'isActive'],
        },
      },
    },
    required: ['tenant', 'subsidiaries', 'directTalents'],
  },
  {
    tenant: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'TENANT',
      name: 'Tenant',
    },
    subsidiaries: [
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        code: 'TOKYO',
        displayName: 'Tokyo Branch',
        path: '/TOKYO/',
        depth: 1,
        isActive: true,
        hasChildren: true,
        talentCount: 5,
      },
    ],
    directTalents: [],
  },
);

const ORGANIZATION_CHILDREN_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      parentId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440100' },
      subsidiaries: {
        type: 'array',
        items: ORGANIZATION_CHILD_NODE_SCHEMA,
      },
      talents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
            code: { type: 'string', example: 'SORA' },
            displayName: { type: 'string', example: 'Sora' },
            avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar/sora.jpg' },
            homepagePath: { type: 'string', nullable: true, example: 'sora' },
            lifecycleStatus: { type: 'string', enum: ['draft', 'published', 'disabled'], example: 'published' },
            publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
            isActive: { type: 'boolean', example: true },
          },
          required: ['id', 'code', 'displayName', 'avatarUrl', 'homepagePath', 'lifecycleStatus', 'publishedAt', 'isActive'],
        },
      },
    },
    required: ['parentId', 'subsidiaries', 'talents'],
  },
  {
    parentId: '550e8400-e29b-41d4-a716-446655440100',
    subsidiaries: [
      {
        id: '550e8400-e29b-41d4-a716-446655440101',
        code: 'GAMING',
        displayName: 'Gaming',
        path: '/TOKYO/GAMING/',
        depth: 2,
        isActive: true,
        hasChildren: false,
        talentCount: 1,
      },
    ],
    talents: [],
  },
);

const ORGANIZATION_BREADCRUMB_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      current: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
          type: { type: 'string', example: 'talent' },
          code: { type: 'string', example: 'SORA' },
          name: { type: 'string', example: 'Sora' },
        },
        required: ['id', 'type', 'code', 'name'],
      },
      breadcrumb: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            type: { type: 'string', example: 'tenant' },
            code: { type: 'string', example: 'TENANT' },
            name: { type: 'string', example: 'Tenant' },
          },
          required: ['id', 'type', 'code', 'name'],
        },
      },
    },
    required: ['current', 'breadcrumb'],
  },
  {
    current: {
      id: '550e8400-e29b-41d4-a716-446655440300',
      type: 'talent',
      code: 'SORA',
      name: 'Sora',
    },
    breadcrumb: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'tenant',
        code: 'TENANT',
        name: 'Tenant',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        type: 'subsidiary',
        code: 'TOKYO',
        name: 'Tokyo Branch',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440300',
        type: 'talent',
        code: 'SORA',
        name: 'Sora',
      },
    ],
  },
);

const ORGANIZATION_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const ORGANIZATION_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Tenant not found',
);

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
    schema: ORGANIZATION_TREE_SUCCESS_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: ORGANIZATION_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Tenant was not found', schema: ORGANIZATION_NOT_FOUND_SCHEMA })
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

    return success({
      tenantId: tree.tenant.id,
      subsidiaries: tree.tree.map((node) => mapTreeNode(node)),
      directTalents: tree.talentsWithoutSubsidiary.map((talent) =>
        mapTreeTalent(talent, {
          subsidiaryId: null,
          path: `/${talent.code}/`,
        })
      ),
    });
  }

  /**
   * GET /api/v1/organization/tree/root
   * Get root level nodes only (for lazy loading)
   */
  @Get('tree/root')
  @ApiOperation({ summary: 'Get root level organization nodes (lazy load)' })
  @ApiResponse({
    status: 200,
    description: 'Returns root-level organization nodes for lazy loading',
    schema: ORGANIZATION_ROOT_SUCCESS_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: ORGANIZATION_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Tenant was not found', schema: ORGANIZATION_NOT_FOUND_SCHEMA })
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
        lifecycleStatus: t.lifecycleStatus,
        publishedAt: t.publishedAt?.toISOString() ?? null,
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
  @ApiResponse({
    status: 200,
    description: 'Returns direct child subsidiaries and talents for lazy loading',
    schema: ORGANIZATION_CHILDREN_SUCCESS_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: ORGANIZATION_UNAUTHORIZED_SCHEMA })
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
        lifecycleStatus: t.lifecycleStatus,
        publishedAt: t.publishedAt?.toISOString() ?? null,
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
  @ApiParam({
    name: 'subpath',
    description: 'Organization path below the tenant root',
    schema: { type: 'string', example: 'TOKYO/SORA' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns current node and breadcrumb for the requested organization path',
    schema: ORGANIZATION_BREADCRUMB_SUCCESS_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: ORGANIZATION_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Tenant was not found', schema: ORGANIZATION_NOT_FOUND_SCHEMA })
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
