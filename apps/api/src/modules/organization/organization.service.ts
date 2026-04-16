// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { OrganizationReadService } from './application/organization-read.service';
import { OrganizationTreeService } from './application/organization-tree.service';
import type { TalentSummary } from './domain/organization-read.policy';
import type {
  OrganizationAccessScopes,
  OrganizationTree,
} from './domain/organization-tree.policy';
import { OrganizationReadRepository } from './infrastructure/organization-read.repository';
import { OrganizationTreeRepository } from './infrastructure/organization-tree.repository';

export type { TalentSummary } from './domain/organization-read.policy';
export type { OrganizationTree, TreeNode } from './domain/organization-tree.policy';

/**
 * Organization Service
 * Provides organization tree and breadcrumb navigation
 */
@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationReadService: OrganizationReadService = new OrganizationReadService(
      new OrganizationReadRepository(),
    ),
    private readonly organizationTreeService: OrganizationTreeService = new OrganizationTreeService(
      new OrganizationTreeRepository(),
    ),
  ) {}

  /**
   * Get user's accessible scope IDs
   */
  async getUserAccessibleScopes(
    tenantSchema: string,
    userId: string,
  ): Promise<OrganizationAccessScopes> {
    return this.organizationTreeService.getUserAccessibleScopes(
      tenantSchema,
      userId,
    );
  }

  /**
   * Get full organization tree
   */
  async getTree(
    tenantId: string,
    tenantSchema: string,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      search?: string;
      language?: string;
      userId?: string; // For filtering by user access
    } = {},
  ): Promise<OrganizationTree> {
    return this.organizationTreeService.getTree(
      tenantId,
      tenantSchema,
      options,
    );
  }

  /**
   * Get breadcrumb for a given path
   */
  async getBreadcrumb(
    tenantId: string,
    tenantSchema: string,
    path: string,
    language: string = 'en',
  ): Promise<Array<{ id: string; type: string; code: string; name: string }>> {
    return this.organizationReadService.getBreadcrumb(
      tenantId,
      tenantSchema,
      path,
      language,
    );
  }

  /**
   * Get children of a parent node (lazy loading)
   * Returns direct child subsidiaries and direct talents
   */
  async getChildren(
    tenantSchema: string,
    parentId: string | null,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      language?: string;
    } = {},
  ): Promise<{
    subsidiaries: Array<{
      id: string;
      code: string;
      name: string;
      path: string;
      depth: number;
      isActive: boolean;
      hasChildren: boolean;
      talentCount: number;
    }>;
    talents: TalentSummary[];
  }> {
    return this.organizationReadService.getChildren(tenantSchema, parentId, options);
  }

  /**
   * Get root level nodes only (for initial lazy load)
   */
  async getRootNodes(
    tenantId: string,
    tenantSchema: string,
    options: {
      includeTalents?: boolean;
      includeInactive?: boolean;
      language?: string;
    } = {},
  ): Promise<{
    tenant: { id: string; code: string; name: string };
    subsidiaries: Array<{
      id: string;
      code: string;
      name: string;
      path: string;
      depth: number;
      isActive: boolean;
      hasChildren: boolean;
      talentCount: number;
    }>;
    directTalents: TalentSummary[];
  }> {
    return this.organizationReadService.getRootNodes(tenantId, tenantSchema, options);
  }
}
