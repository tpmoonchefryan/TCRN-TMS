import type { SubsidiaryInfo, TalentInfo } from '@/stores/talent-store';

export type SidebarNodeType = 'subsidiary' | 'talent' | 'tenant';

export interface SidebarTreeNode {
  id: string;
  name: string;
  type: SidebarNodeType;
  children: SidebarTreeNode[];
}

function createTalentSidebarNode(talent: TalentInfo): SidebarTreeNode {
  return {
    id: talent.id,
    name: talent.displayName,
    type: 'talent',
    children: [],
  };
}

function createSubsidiarySidebarNode(subsidiary: SubsidiaryInfo): SidebarTreeNode {
  return {
    id: subsidiary.id,
    name: subsidiary.displayName,
    type: 'subsidiary',
    children: [
      ...subsidiary.children.map(createSubsidiarySidebarNode),
      ...subsidiary.talents.map(createTalentSidebarNode),
    ],
  };
}

export function buildSidebarTree(
  organizationTree: SubsidiaryInfo[],
  tenantId: string | null
): SidebarTreeNode[] {
  if (organizationTree.length === 0) {
    return [];
  }

  return [
    {
      id: tenantId || 'current-tenant',
      name: 'Current Tenant',
      type: 'tenant',
      children: organizationTree.map(createSubsidiarySidebarNode),
    },
  ];
}

export function getSidebarHref(node: SidebarTreeNode): string {
  if (node.type === 'tenant') {
    return '/organization';
  }

  return `/organization/${node.type === 'talent' ? 'talents' : 'subsidiaries'}/${node.id}`;
}
