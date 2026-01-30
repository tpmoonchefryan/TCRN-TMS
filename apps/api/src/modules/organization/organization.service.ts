// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

export interface TreeNode {
  id: string;
  type: 'subsidiary';
  code: string;
  name: string;
  path: string;
  depth: number;
  isActive: boolean;
  talentCount: number;
  children: TreeNode[];
  talents?: TalentSummary[];
}

export interface TalentSummary {
  id: string;
  code: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  isActive: boolean;
}

export interface OrganizationTree {
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  tree: TreeNode[];
  talentsWithoutSubsidiary: TalentSummary[];
}

interface RawSubsidiary {
  id: string;
  parent_id: string | null;
  code: string;
  path: string;
  depth: number;
  name_en: string;
  name_zh: string | null;
  name_ja: string | null;
  is_active: boolean;
}

/**
 * Organization Service
 * Provides organization tree and breadcrumb navigation
 */
@Injectable()
export class OrganizationService {
  /**
   * Get user's accessible scope IDs
   */
  async getUserAccessibleScopes(
    tenantSchema: string,
    userId: string
  ): Promise<{
    tenantAccess: boolean;
    tenantIncludeSubunits: boolean;
    subsidiaryIds: Set<string>;
    subsidiaryIncludeSubunits: Set<string>;
    talentIds: Set<string>;
  }> {
    const accesses = await prisma.$queryRawUnsafe<Array<{
      scope_type: string;
      scope_id: string | null;
      include_subunits: boolean;
    }>>(`
      SELECT scope_type, scope_id, include_subunits
      FROM "${tenantSchema}".user_scope_access
      WHERE user_id = $1::uuid
    `, userId);

    const result = {
      tenantAccess: false,
      tenantIncludeSubunits: false,
      subsidiaryIds: new Set<string>(),
      subsidiaryIncludeSubunits: new Set<string>(),
      talentIds: new Set<string>(),
    };

    for (const access of accesses) {
      if (access.scope_type === 'tenant') {
        result.tenantAccess = true;
        result.tenantIncludeSubunits = access.include_subunits;
      } else if (access.scope_type === 'subsidiary' && access.scope_id) {
        result.subsidiaryIds.add(access.scope_id);
        if (access.include_subunits) {
          result.subsidiaryIncludeSubunits.add(access.scope_id);
        }
      } else if (access.scope_type === 'talent' && access.scope_id) {
        result.talentIds.add(access.scope_id);
      }
    }

    return result;
  }

  /**
   * Get all descendant subsidiary IDs for a given subsidiary (including self)
   */
  private async getDescendantSubsidiaryIds(
    tenantSchema: string,
    subsidiaryId: string
  ): Promise<Set<string>> {
    // Get the path of the subsidiary, then find all with matching path prefix
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(`
      SELECT s2.id, s2.path
      FROM "${tenantSchema}".subsidiary s1
      JOIN "${tenantSchema}".subsidiary s2 ON s2.path LIKE s1.path || '%'
      WHERE s1.id = $1::uuid
    `, subsidiaryId);

    return new Set(subsidiaries.map(s => s.id));
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
    } = {}
  ): Promise<OrganizationTree> {
    const { includeTalents = true, includeInactive = false, search, language = 'en', userId } = options;

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    // Get name field based on language
    // const nameField = language === 'zh' ? 'name_zh' : language === 'ja' ? 'name_ja' : 'name_en';

    // Get full tree if no search
    if (!search) {
      // Logic for full tree (existing simplified logic or just pass through)
      // Actually, let's just make the SQL builder handle both cases if possible, 
      // but "No Search" is simpler: just get all active.
    
      const subWhereClause = includeInactive ? '1=1' : 'is_active = true';
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{
        id: string;
        parent_id: string | null;
        code: string;
        path: string;
        depth: number;
        name_en: string;
        name_zh: string | null;
        name_ja: string | null;
        is_active: boolean;
      }>>(`
        SELECT id, parent_id, code, path, depth, name_en, name_zh, name_ja, is_active
        FROM "${tenantSchema}".subsidiary
        WHERE ${subWhereClause}
        ORDER BY depth, sort_order, name_en
      `);

      const tree = await this.buildTreeResponse(tenant, subsidiaries, tenantSchema, language, includeTalents, includeInactive, false, '');
      
      // Apply user access filter if userId is provided
      if (userId) {
        return this.filterTreeByUserAccess(tree, tenantSchema, userId, tenantId);
      }
      
      return tree;
    }

    // --- Search Logic ---

    // 1. Find matched subsidiaries
    const subParams = [`%${search}%`];
    let subSearchClause = '1=1';
    if (!includeInactive) subSearchClause += ' AND is_active = true';
    subSearchClause += ` AND (code ILIKE $1 OR name_en ILIKE $1 OR name_zh ILIKE $1 OR name_ja ILIKE $1)`;

    const matchedSubs = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
      SELECT path FROM "${tenantSchema}".subsidiary WHERE ${subSearchClause}
    `, ...subParams);

    // 2. Find matched talents and their subsidiaries
    let talentSearchClause = '1=1';
    if (!includeInactive) talentSearchClause += ' AND is_active = true';
    talentSearchClause += ` AND (code ILIKE $1 OR name_en ILIKE $1 OR display_name ILIKE $1)`;

    const matchedTalentSubs = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string }>>(`
      SELECT DISTINCT subsidiary_id 
      FROM "${tenantSchema}".talent 
      WHERE subsidiary_id IS NOT NULL AND ${talentSearchClause}
    `, ...subParams);

    // 3. Get paths for talent subsidiaries (using raw SQL for tenant schema)
    let talentSubPaths: Array<{ path: string }> = [];
    if (matchedTalentSubs.length > 0) {
      const ids = matchedTalentSubs.map(t => t.subsidiary_id);
      // Use parameterized query with uuid array for safety
      talentSubPaths = await prisma.$queryRawUnsafe<Array<{ path: string }>>(
        `SELECT path FROM "${tenantSchema}".subsidiary WHERE id = ANY($1::uuid[])`,
        ids
      );
    }

    // 4. Collect all paths and expand to ancestors
    const allPaths = new Set<string>();
    [...matchedSubs, ...talentSubPaths].forEach(s => {
      // Path format: /ROOT/SUB/
      // Split by / -> ['', 'ROOT', 'SUB', '']
      const parts = s.path.split('/').filter(Boolean);
      let currentPath = '/';
      allPaths.add(currentPath); // Root usually doesn't exist as subsidiary but logic handles it
      
      parts.forEach(part => {
        currentPath += part + '/';
        allPaths.add(currentPath);
      });
    });

    // 5. Fetch all relevant subsidiaries
    // Since we have a list of exact paths, we can query them.
    // However, the set might be large.
    // If set is empty, return empty tree (or just root if exists?)
    
    if (allPaths.size === 0) {
         // No matches found
         return {
            tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
            tree: [],
            talentsWithoutSubsidiary: includeTalents ? await this.getDirectTalents(tenantSchema, search, includeInactive, language) : [],
         };
    }

    // Fetch using parameterized array for paths (safe from SQL injection)
    const uniquePaths = Array.from(allPaths);
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{
        id: string;
        parent_id: string | null;
        code: string;
        path: string;
        depth: number;
        name_en: string;
        name_zh: string | null;
        name_ja: string | null;
        is_active: boolean;
    }>>(
      `SELECT id, parent_id, code, path, depth, name_en, name_zh, name_ja, is_active
       FROM "${tenantSchema}".subsidiary
       WHERE path = ANY($1::text[])
       ORDER BY depth, sort_order, name_en`,
      uniquePaths
    );

    const tree = await this.buildTreeResponse(tenant, subsidiaries, tenantSchema, language, includeTalents, includeInactive, true, search);
    
    // Apply user access filter if userId is provided
    if (userId) {
      return this.filterTreeByUserAccess(tree, tenantSchema, userId, tenantId);
    }
    
    return tree;
  }

  /**
   * Filter organization tree by user's accessible scopes
   */
  private async filterTreeByUserAccess(
    tree: OrganizationTree,
    tenantSchema: string,
    userId: string,
    _tenantId: string
  ): Promise<OrganizationTree> {
    const accessScopes = await this.getUserAccessibleScopes(tenantSchema, userId);
    
    // If user has tenant access with includeSubunits, they can see everything
    if (accessScopes.tenantAccess && accessScopes.tenantIncludeSubunits) {
      return tree;
    }

    // Build set of all accessible subsidiary IDs (including descendants from includeSubunits)
    const accessibleSubsidiaryIds = new Set<string>();
    
    // Add directly accessible subsidiaries
    for (const subId of accessScopes.subsidiaryIds) {
      accessibleSubsidiaryIds.add(subId);
    }
    
    // Add descendants for subsidiaries with includeSubunits
    for (const subId of accessScopes.subsidiaryIncludeSubunits) {
      const descendants = await this.getDescendantSubsidiaryIds(tenantSchema, subId);
      for (const descId of descendants) {
        accessibleSubsidiaryIds.add(descId);
      }
    }

    // Get all talents under accessible subsidiaries (for includeSubunits only)
    const accessibleTalentIds = new Set(accessScopes.talentIds);
    
    // If tenant has includeSubunits or subsidiary has includeSubunits, include all talents under them
    if (accessScopes.tenantIncludeSubunits) {
      // All talents accessible - handled above by returning full tree
    } else {
      // For subsidiaries with includeSubunits, get all talents under them
      for (const subId of accessScopes.subsidiaryIncludeSubunits) {
        const talentsUnderSub = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT t.id
          FROM "${tenantSchema}".talent t
          JOIN "${tenantSchema}".subsidiary s ON t.subsidiary_id = s.id
          WHERE s.path LIKE (SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid) || '%'
        `, subId);
        for (const t of talentsUnderSub) {
          accessibleTalentIds.add(t.id);
        }
      }
      
      // NOTE: For directly accessible subsidiaries WITHOUT includeSubunits,
      // we do NOT automatically include their talents.
      // Users must have explicit talent-level access to see those talents.
    }
    
    // For talents that user has direct access to, we need to include their parent subsidiaries
    // so the tree structure is navigable
    for (const talentId of accessScopes.talentIds) {
      const talentSubs = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string | null }>>(`
        SELECT subsidiary_id FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, talentId);
      if (talentSubs.length > 0 && talentSubs[0].subsidiary_id) {
        const subId = talentSubs[0].subsidiary_id;
        accessibleSubsidiaryIds.add(subId);
        // Also add ancestor subsidiaries for navigation
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT s2.id 
          FROM "${tenantSchema}".subsidiary s1
          JOIN "${tenantSchema}".subsidiary s2 ON s1.path LIKE s2.path || '%'
          WHERE s1.id = $1::uuid AND s2.id != $1::uuid
        `, subId);
        for (const anc of ancestors) {
          accessibleSubsidiaryIds.add(anc.id);
        }
      }
    }

    // Filter tree nodes recursively
    const filterNode = (node: TreeNode): TreeNode | null => {
      // Check if this subsidiary is accessible
      if (!accessibleSubsidiaryIds.has(node.id)) {
        return null;
      }

      // Filter children
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is TreeNode => n !== null);

      // Filter talents
      const filteredTalents = node.talents
        ? node.talents.filter(t => accessibleTalentIds.has(t.id))
        : undefined;

      return {
        ...node,
        children: filteredChildren,
        talents: filteredTalents,
      };
    };

    // Filter root nodes
    const filteredTree = tree.tree
      .map(filterNode)
      .filter((n): n is TreeNode => n !== null);

    // Filter direct talents - only show explicitly accessible talents
    // Note: tenantAccess without includeSubunits does NOT grant access to all direct talents
    const filteredDirectTalents = tree.talentsWithoutSubsidiary.filter(t => 
      accessibleTalentIds.has(t.id)
    );

    return {
      tenant: tree.tenant,
      tree: filteredTree,
      talentsWithoutSubsidiary: filteredDirectTalents,
    };
  }

  private async getDirectTalents(tenantSchema: string, search: string | undefined, includeInactive: boolean, language: string): Promise<TalentSummary[]> {
    let whereClause = 'subsidiary_id IS NULL';
    const params: string[] = [];
    let paramIndex = 1;

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }
    if (search) {
      whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      name_en: string;
      name_zh: string | null;
      name_ja: string | null;
      display_name: string;
      avatar_url: string | null;
      homepage_path: string | null;
      is_active: boolean;
    }>>(
      `SELECT id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path, is_active
       FROM "${tenantSchema}".talent
       WHERE ${whereClause}
       ORDER BY display_name`,
      ...params
    );

    return talents.map(t => ({
      id: t.id,
      code: t.code,
      name: (language === 'zh' ? t.name_zh : language === 'ja' ? t.name_ja : t.name_en) || t.name_en,
      displayName: t.display_name,
      avatarUrl: t.avatar_url,
      homepagePath: t.homepage_path,
      isActive: t.is_active,
    }));
  }

  private async buildTreeResponse(
    tenant: { id: string; code: string; name: string },
    subsidiaries: RawSubsidiary[], 
    tenantSchema: string, 
    language: string, 
    includeTalents: boolean, 
    includeInactive: boolean,
    isSearch: boolean,
    searchQuery: string | undefined
  ): Promise<OrganizationTree> {
    
    // Get talent counts per subsidiary (Simplified: just get all if not search, or filter)
    // Actually, tree construction logic is same
    // We need to fetch talents if required.
    
    // ... Copying logic to new helper ...
    // Wait, I should not make it too complex in replacement.
    // I will inline the build logic back or use a helper *if* I define it in the class.
    // Since I cannot easily add a new method AND replace body in one go (cleanly), 
    // I will put the fetch logic here.

    // Calculate count map
    const talentCounts = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string; count: bigint }>>(`
      SELECT subsidiary_id, COUNT(*) as count
      FROM "${tenantSchema}".talent
      WHERE subsidiary_id IS NOT NULL ${includeInactive ? '' : 'AND is_active = true'}
      GROUP BY subsidiary_id
    `);
    const countMap = new Map(talentCounts.map(tc => [tc.subsidiary_id, Number(tc.count)]));

    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    for (const sub of subsidiaries) {
      const node: TreeNode = {
        id: sub.id,
        type: 'subsidiary',
        code: sub.code,
        name: (language === 'zh' ? sub.name_zh : language === 'ja' ? sub.name_ja : sub.name_en) || sub.name_en,
        path: sub.path,
        depth: sub.depth,
        isActive: sub.is_active,
        talentCount: (countMap.get(sub.id) as number) || 0,
        children: [],
      };
      nodeMap.set(sub.id, node);

      if (sub.parent_id && nodeMap.has(sub.parent_id)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        nodeMap.get(sub.parent_id)!.children.push(node);
      } else if (!sub.parent_id) {
        rootNodes.push(node);
      }
    }

    let talentsWithoutSubsidiary: TalentSummary[] = [];

    if (includeTalents) {
      let talentWhereClause = includeInactive ? '1=1' : 'is_active = true';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];
      if (isSearch && searchQuery) {
        talentWhereClause += ` AND (code ILIKE $1 OR name_en ILIKE $1 OR display_name ILIKE $1)`;
        params.push(`%${searchQuery}%`);
      }

      // If search, we only want matching talents.
      // If no search, we want ALL talents.
      
      // If no search, we want ALL talents.
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const talents = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, subsidiary_id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path, is_active
        FROM "${tenantSchema}".talent
        WHERE ${talentWhereClause}
        ORDER BY display_name
      `, ...params);

      // Group talents
       const talentsBySubsidiary = new Map<string | null, TalentSummary[]>();
       for (const talent of talents) {
         const summary: TalentSummary = {
           id: talent.id,
           code: talent.code,
           name: (language === 'zh' ? talent.name_zh : language === 'ja' ? talent.name_ja : talent.name_en) || talent.name_en,
           displayName: talent.display_name,
           avatarUrl: talent.avatar_url,
           homepagePath: talent.homepage_path,
           isActive: talent.is_active,
         };
         
         const key = talent.subsidiary_id;
         if (!talentsBySubsidiary.has(key)) {
            talentsBySubsidiary.set(key, []);
         }
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         talentsBySubsidiary.get(key)!.push(summary);
       }

       for (const [subId, talentList] of talentsBySubsidiary) {
         if (subId && nodeMap.has(subId)) {
           // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
           nodeMap.get(subId)!.talents = talentList;
         }
       }
       
       talentsWithoutSubsidiary = talentsBySubsidiary.get(null) || [];
    }
    
    // We already have tenant from the top of the function
    // But since I'm rewriting the body, I need to make sure 'tenant' variable is available
    // I will just return the object structure expected.
    
    // RE-FETCH tenant (safe) or assume it's passed? The original method fetched it at top.
    // I need to be careful about matching the return signature.
    
    return {
        tenant: {
          id: tenant.id,
          code: tenant.code,
          name: tenant.name,
        },
        tree: rootNodes,
        talentsWithoutSubsidiary
    };
  }

  /**
   * Get breadcrumb for a given path
   */
  async getBreadcrumb(
    tenantId: string,
    tenantSchema: string,
    path: string,
    language: string = 'en'
  ): Promise<Array<{ id: string; type: string; code: string; name: string }>> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const breadcrumb: Array<{ id: string; type: string; code: string; name: string }> = [
      { id: tenant.id, type: 'tenant', code: tenant.code, name: tenant.name },
    ];

    // Extract codes from path
    const pathSegments = path.split('/').filter(Boolean);

    // Query subsidiaries and talent for each segment
    for (let i = 0; i < pathSegments.length; i++) {
      const currentPath = '/' + pathSegments.slice(0, i + 1).join('/') + '/';
      
      // Check if it's a subsidiary
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{
        id: string;
        code: string;
        name_en: string;
        name_zh: string | null;
        name_ja: string | null;
      }>>(`
        SELECT id, code, name_en, name_zh, name_ja
        FROM "${tenantSchema}".subsidiary
        WHERE path = $1
      `, currentPath);

      if (subsidiaries.length > 0) {
        const sub = subsidiaries[0];
        breadcrumb.push({
          id: sub.id,
          type: 'subsidiary',
          code: sub.code,
          name: (language === 'zh' ? sub.name_zh : language === 'ja' ? sub.name_ja : sub.name_en) || sub.name_en,
        });
        continue;
      }

      // Check if it's a talent
      const talents = await prisma.$queryRawUnsafe<Array<{
        id: string;
        code: string;
        display_name: string;
      }>>(`
        SELECT id, code, display_name
        FROM "${tenantSchema}".talent
        WHERE path = $1
      `, currentPath);

      if (talents.length > 0) {
        const talent = talents[0];
        breadcrumb.push({
          id: talent.id,
          type: 'talent',
          code: talent.code,
          name: talent.display_name,
        });
      }
    }

    return breadcrumb;
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
    } = {}
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
    const { includeTalents = true, includeInactive = false, language = 'en' } = options;

    // Build where clause for subsidiaries
    let subWhereClause = parentId 
      ? `parent_id = $1::uuid` 
      : `parent_id IS NULL`;
    if (!includeInactive) {
      subWhereClause += ' AND is_active = true';
    }

    const subParams = parentId ? [parentId] : [];

    // Get direct child subsidiaries
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      path: string;
      depth: number;
      name_en: string;
      name_zh: string | null;
      name_ja: string | null;
      is_active: boolean;
    }>>(
      `SELECT id, code, path, depth, name_en, name_zh, name_ja, is_active
       FROM "${tenantSchema}".subsidiary
       WHERE ${subWhereClause}
       ORDER BY sort_order, name_en`,
      ...subParams
    );

    // Get child counts for each subsidiary (to know if they have children)
    const subIds = subsidiaries.map(s => s.id);
    let childCountMap = new Map<string, number>();
    let talentCountMap = new Map<string, number>();

    if (subIds.length > 0) {
      // Count child subsidiaries
      const childCounts = await prisma.$queryRawUnsafe<Array<{ parent_id: string; count: bigint }>>(
        `SELECT parent_id, COUNT(*) as count
         FROM "${tenantSchema}".subsidiary
         WHERE parent_id = ANY($1::uuid[]) ${includeInactive ? '' : 'AND is_active = true'}
         GROUP BY parent_id`,
        subIds
      );
      childCountMap = new Map(childCounts.map(c => [c.parent_id, Number(c.count)]));

      // Count talents per subsidiary
      const talentCounts = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string; count: bigint }>>(
        `SELECT subsidiary_id, COUNT(*) as count
         FROM "${tenantSchema}".talent
         WHERE subsidiary_id = ANY($1::uuid[]) ${includeInactive ? '' : 'AND is_active = true'}
         GROUP BY subsidiary_id`,
        subIds
      );
      talentCountMap = new Map(talentCounts.map(c => [c.subsidiary_id, Number(c.count)]));
    }

    // Format subsidiaries response
    const formattedSubsidiaries = subsidiaries.map(sub => ({
      id: sub.id,
      code: sub.code,
      name: (language === 'zh' ? sub.name_zh : language === 'ja' ? sub.name_ja : sub.name_en) || sub.name_en,
      path: sub.path,
      depth: sub.depth,
      isActive: sub.is_active,
      hasChildren: (childCountMap.get(sub.id) || 0) > 0 || (talentCountMap.get(sub.id) || 0) > 0,
      talentCount: talentCountMap.get(sub.id) || 0,
    }));

    // Get direct talents if requested
    let talents: TalentSummary[] = [];
    if (includeTalents) {
      let talentWhereClause = parentId
        ? `subsidiary_id = $1::uuid`
        : `subsidiary_id IS NULL`;
      if (!includeInactive) {
        talentWhereClause += ' AND is_active = true';
      }

      const talentParams = parentId ? [parentId] : [];

      const talentResults = await prisma.$queryRawUnsafe<Array<{
        id: string;
        code: string;
        name_en: string;
        name_zh: string | null;
        name_ja: string | null;
        display_name: string;
        avatar_url: string | null;
        homepage_path: string | null;
        is_active: boolean;
      }>>(
        `SELECT id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path, is_active
         FROM "${tenantSchema}".talent
         WHERE ${talentWhereClause}
         ORDER BY display_name`,
        ...talentParams
      );

      talents = talentResults.map(t => ({
        id: t.id,
        code: t.code,
        name: (language === 'zh' ? t.name_zh : language === 'ja' ? t.name_ja : t.name_en) || t.name_en,
        displayName: t.display_name,
        avatarUrl: t.avatar_url,
        homepagePath: t.homepage_path,
        isActive: t.is_active,
      }));
    }

    return {
      subsidiaries: formattedSubsidiaries,
      talents,
    };
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
    } = {}
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
    // Get tenant info
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const children = await this.getChildren(tenantSchema, null, options);

    return {
      tenant: {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
      },
      subsidiaries: children.subsidiaries,
      directTalents: children.talents,
    };
  }
}
