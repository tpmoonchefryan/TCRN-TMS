// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  localizeOrganizationName,
  mapTalentSummary,
  type RawSubsidiary,
  type RawTalent,
  type TalentSummary,
} from './organization-read.policy';

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

export interface OrganizationTree {
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  tree: TreeNode[];
  talentsWithoutSubsidiary: TalentSummary[];
}

export interface RawOrganizationScopeAccess {
  scope_type: string;
  scope_id: string | null;
  include_subunits: boolean;
}

export interface OrganizationAccessScopes {
  tenantAccess: boolean;
  tenantIncludeSubunits: boolean;
  subsidiaryIds: Set<string>;
  subsidiaryIncludeSubunits: Set<string>;
  talentIds: Set<string>;
}

export interface RawTalentCount {
  subsidiary_id: string;
  count: bigint;
}

export const buildOrganizationAccessScopes = (
  accesses: RawOrganizationScopeAccess[],
): OrganizationAccessScopes => {
  const result: OrganizationAccessScopes = {
    tenantAccess: false,
    tenantIncludeSubunits: false,
    subsidiaryIds: new Set<string>(),
    subsidiaryIncludeSubunits: new Set<string>(),
    talentIds: new Set<string>(),
  };

  for (const access of accesses) {
    if (access.scope_type === 'tenant') {
      result.tenantAccess = true;
      result.tenantIncludeSubunits =
        result.tenantIncludeSubunits || access.include_subunits;
      continue;
    }

    if (access.scope_type === 'subsidiary' && access.scope_id) {
      result.subsidiaryIds.add(access.scope_id);
      if (access.include_subunits) {
        result.subsidiaryIncludeSubunits.add(access.scope_id);
      }
      continue;
    }

    if (access.scope_type === 'talent' && access.scope_id) {
      result.talentIds.add(access.scope_id);
    }
  }

  return result;
};

export const collectExpandedSearchPaths = (paths: string[]): string[] => {
  const expandedPaths = new Set<string>();

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean);
    let currentPath = '/';

    for (const segment of segments) {
      currentPath += `${segment}/`;
      expandedPaths.add(currentPath);
    }
  }

  return Array.from(expandedPaths);
};

export const buildOrganizationTree = (params: {
  tenant: { id: string; code: string; name: string };
  subsidiaries: RawSubsidiary[];
  talentCounts: RawTalentCount[];
  talents: RawTalent[];
  language: string;
}): OrganizationTree => {
  const countMap = new Map(
    params.talentCounts.map((countRow) => [
      countRow.subsidiary_id,
      Number(countRow.count),
    ]),
  );
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  for (const subsidiary of params.subsidiaries) {
    const node: TreeNode = {
      id: subsidiary.id,
      type: 'subsidiary',
      code: subsidiary.code,
      name: localizeOrganizationName(subsidiary, params.language),
      path: subsidiary.path,
      depth: subsidiary.depth,
      isActive: subsidiary.is_active,
      talentCount: countMap.get(subsidiary.id) ?? 0,
      children: [],
    };
    nodeMap.set(subsidiary.id, node);

    if (subsidiary.parent_id && nodeMap.has(subsidiary.parent_id)) {
      nodeMap.get(subsidiary.parent_id)?.children.push(node);
      continue;
    }

    if (!subsidiary.parent_id) {
      rootNodes.push(node);
    }
  }

  const talentsBySubsidiary = new Map<string | null, TalentSummary[]>();

  for (const talent of params.talents) {
    const summary = mapTalentSummary(talent, params.language);
    const key = talent.subsidiary_id ?? null;
    const existing = talentsBySubsidiary.get(key) ?? [];
    existing.push(summary);
    talentsBySubsidiary.set(key, existing);
  }

  for (const [subsidiaryId, talents] of talentsBySubsidiary) {
    if (subsidiaryId && nodeMap.has(subsidiaryId)) {
      const node = nodeMap.get(subsidiaryId);
      if (node) {
        node.talents = talents;
      }
    }
  }

  return {
    tenant: {
      id: params.tenant.id,
      code: params.tenant.code,
      name: params.tenant.name,
    },
    tree: rootNodes,
    talentsWithoutSubsidiary: talentsBySubsidiary.get(null) ?? [],
  };
};

export const filterOrganizationTree = (
  tree: OrganizationTree,
  accessibleSubsidiaryIds: Set<string>,
  accessibleTalentIds: Set<string>,
): OrganizationTree => {
  const filterNode = (node: TreeNode): TreeNode | null => {
    if (!accessibleSubsidiaryIds.has(node.id)) {
      return null;
    }

    const children = node.children
      .map(filterNode)
      .filter((child): child is TreeNode => child !== null);

    const talents = node.talents?.filter((talent) =>
      accessibleTalentIds.has(talent.id),
    );

    return {
      ...node,
      children,
      talents,
    };
  };

  return {
    tenant: tree.tenant,
    tree: tree.tree
      .map(filterNode)
      .filter((node): node is TreeNode => node !== null),
    talentsWithoutSubsidiary: tree.talentsWithoutSubsidiary.filter((talent) =>
      accessibleTalentIds.has(talent.id),
    ),
  };
};
