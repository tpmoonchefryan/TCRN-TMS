// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  profileStoreApi,
  type ProfileStoreSummaryRecord,
  subsidiaryApi,
  type SubsidiaryCreatePayload,
} from '@/lib/api/modules/configuration';
import {
  organizationApi,
  type OrganizationTreeQuery,
} from '@/lib/api/modules/organization';
import { type CreateTalentPayload,talentApi } from '@/lib/api/modules/talent';
import type { SubsidiaryInfo } from '@/platform/state/talent-store';

export type OrganizationRouteAction = 'details' | 'settings';
export type OrganizationRouteNodeType = 'tenant' | 'subsidiary' | 'talent';

export interface OrganizationRouteNode {
  id: string;
  type: OrganizationRouteNodeType;
}

export interface SubsidiaryOption {
  id: string;
  displayName: string;
}

export const organizationManagementApi = {
  getTree: (query?: OrganizationTreeQuery) => organizationApi.getTree(query),

  listProfileStores: () => profileStoreApi.list({ includeInactive: false }),

  createSubsidiary: (payload: SubsidiaryCreatePayload) => subsidiaryApi.create(payload),

  createTalent: (payload: CreateTalentPayload) => talentApi.create(payload),
};

export function flattenOrganizationSubsidiaries(
  subsidiaries: SubsidiaryInfo[],
  prefix = '',
): SubsidiaryOption[] {
  const result: SubsidiaryOption[] = [];

  for (const subsidiary of subsidiaries) {
    result.push({
      id: subsidiary.id,
      displayName: `${prefix}${subsidiary.displayName}`,
    });

    if (subsidiary.children.length > 0) {
      result.push(...flattenOrganizationSubsidiaries(subsidiary.children, `${prefix}  `));
    }
  }

  return result;
}

export function findSubsidiaryForTalent(
  talentId: string,
  subsidiaries: SubsidiaryInfo[],
): SubsidiaryInfo | null {
  for (const subsidiary of subsidiaries) {
    if (subsidiary.talents.some((talent) => talent.id === talentId)) {
      return subsidiary;
    }

    if (subsidiary.children.length > 0) {
      const nestedMatch = findSubsidiaryForTalent(talentId, subsidiary.children);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return null;
}

export function buildOrganizationNodeRoute(params: {
  tenantId: string;
  node: OrganizationRouteNode;
  action: OrganizationRouteAction;
  subsidiaries: SubsidiaryInfo[];
}): string {
  const { action, node, subsidiaries, tenantId } = params;

  switch (node.type) {
    case 'tenant':
      return `/tenant/${tenantId}/${action === 'settings' ? 'settings' : ''}`;
    case 'subsidiary':
      return `/tenant/${tenantId}/subsidiary/${node.id}/${action}`;
    case 'talent': {
      const parentSubsidiary = findSubsidiaryForTalent(node.id, subsidiaries);
      if (parentSubsidiary) {
        return `/tenant/${tenantId}/subsidiary/${parentSubsidiary.id}/talent/${node.id}/${action}`;
      }

      return `/tenant/${tenantId}/talent/${node.id}/${action}`;
    }
  }
}

export type { ProfileStoreSummaryRecord };
