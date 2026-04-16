// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ApiResponse } from '../core';
import { apiClient } from '../core';
import type { TalentLifecycleStatus } from './talent';

export interface OrganizationTreeQuery {
  search?: string;
  includeInactive?: boolean;
  includeTalents?: boolean;
}

export interface OrganizationTreeTalentRecord {
  id: string;
  code: string;
  displayName: string;
  avatarUrl?: string;
  subsidiaryId?: string | null;
  subsidiaryName?: string;
  path: string;
  homepagePath?: string | null;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt?: string | null;
  isActive: boolean;
}

export interface OrganizationTreeSubsidiaryRecord {
  id: string;
  code: string;
  displayName: string;
  parentId?: string | null;
  path: string;
  talents: OrganizationTreeTalentRecord[];
  children: OrganizationTreeSubsidiaryRecord[];
}

export interface OrganizationTreeResponse {
  tenantId: string;
  subsidiaries: OrganizationTreeSubsidiaryRecord[];
  directTalents: OrganizationTreeTalentRecord[];
}

export interface OrganizationScopeOption {
  id: string;
  type: 'subsidiary' | 'talent';
  label: string;
  path: string;
}

const joinScopeLabel = (segments: string[]) => segments.join(' / ');

interface RawOrganizationTreeTalentRecord
  extends Omit<OrganizationTreeTalentRecord, 'avatarUrl' | 'subsidiaryName'> {
  avatarUrl?: string | null;
  subsidiaryName?: string | null;
}

interface RawOrganizationTreeSubsidiaryRecord
  extends Omit<OrganizationTreeSubsidiaryRecord, 'talents' | 'children'> {
  talents: RawOrganizationTreeTalentRecord[];
  children: RawOrganizationTreeSubsidiaryRecord[];
}

interface RawOrganizationTreeResponse
  extends Omit<OrganizationTreeResponse, 'subsidiaries' | 'directTalents'> {
  subsidiaries: RawOrganizationTreeSubsidiaryRecord[];
  directTalents: RawOrganizationTreeTalentRecord[];
}

const normalizeOrganizationTalent = (
  talent: RawOrganizationTreeTalentRecord
): OrganizationTreeTalentRecord => ({
  ...talent,
  avatarUrl: talent.avatarUrl ?? undefined,
  subsidiaryName: talent.subsidiaryName ?? undefined,
});

const normalizeOrganizationSubsidiary = (
  subsidiary: RawOrganizationTreeSubsidiaryRecord
): OrganizationTreeSubsidiaryRecord => ({
  ...subsidiary,
  talents: subsidiary.talents.map(normalizeOrganizationTalent),
  children: subsidiary.children.map(normalizeOrganizationSubsidiary),
});

const normalizeOrganizationTree = (
  organization: RawOrganizationTreeResponse
): OrganizationTreeResponse => ({
  tenantId: organization.tenantId,
  subsidiaries: organization.subsidiaries.map(normalizeOrganizationSubsidiary),
  directTalents: organization.directTalents.map(normalizeOrganizationTalent),
});

const collectScopedSubsidiaries = (
  subsidiaries: OrganizationTreeSubsidiaryRecord[],
  ancestorLabels: string[] = []
): OrganizationScopeOption[] => {
  const scopes: OrganizationScopeOption[] = [];

  for (const subsidiary of subsidiaries) {
    const labelSegments = [...ancestorLabels, subsidiary.displayName];

    scopes.push({
      id: subsidiary.id,
      type: 'subsidiary',
      label: joinScopeLabel(labelSegments),
      path: subsidiary.path,
    });

    for (const talent of subsidiary.talents) {
      scopes.push({
        id: talent.id,
        type: 'talent',
        label: joinScopeLabel([...labelSegments, talent.displayName]),
        path: talent.path,
      });
    }

    scopes.push(...collectScopedSubsidiaries(subsidiary.children, labelSegments));
  }

  return scopes;
};

export const buildOrganizationScopeOptions = (
  organization: OrganizationTreeResponse
): OrganizationScopeOption[] => [
  ...collectScopedSubsidiaries(organization.subsidiaries),
  ...organization.directTalents.map((talent) => ({
    id: talent.id,
    type: 'talent' as const,
    label: talent.displayName,
    path: talent.path,
  })),
];

export const organizationApi = {
  getTree: async (
    params?: OrganizationTreeQuery
  ): Promise<ApiResponse<OrganizationTreeResponse>> => {
    const response = await apiClient.get<RawOrganizationTreeResponse>(
      '/api/v1/organization/tree',
      params
    );

    if (!response.success || !response.data) {
      return response as ApiResponse<OrganizationTreeResponse>;
    }

    return {
      ...response,
      data: normalizeOrganizationTree(response.data),
    };
  },
};
