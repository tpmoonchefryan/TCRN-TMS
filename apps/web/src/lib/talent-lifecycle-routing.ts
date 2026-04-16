// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { TalentInfo } from '@/stores/talent-store';

const PUBLISH_GATED_ROUTE_PREFIXES = ['/customers', '/homepage', '/marshmallow', '/reports'];
const UTILITY_ROUTE_PREFIXES = ['/profile', '/logs'];

export type TalentWorkspaceRouteType = 'publish-gated' | 'utility' | 'other';
export type TalentBusinessBlockedNotice = 'publish-required' | 're-enable-required';

export type BusinessWorkspaceEntryDecision =
  | { type: 'allow' }
  | { type: 'auto-select'; talent: TalentInfo }
  | { type: 'show-modal'; talents: TalentInfo[] }
  | { type: 'redirect'; href: string };

interface BuildTalentManagementUrlOptions {
  tenantId: string;
  talentId: string;
  subsidiaryId?: string | null;
  destination: 'details' | 'settings';
  notice?: TalentBusinessBlockedNotice;
  from?: string | null;
}

interface ResolveTalentHomeRedirectOptions {
  tenantId: string | null | undefined;
  accessibleTalents: TalentInfo[];
}

interface ResolveBusinessWorkspaceEntryOptions {
  tenantId: string | null | undefined;
  pathname: string | null | undefined;
  search?: string | null;
  accessibleTalents: TalentInfo[];
  currentTalent: TalentInfo | null;
}

const matchesRoutePrefix = (pathname: string, prefix: string): boolean => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export const isPublishedTalent = (
  talent: TalentInfo | null | undefined
): talent is TalentInfo & { lifecycleStatus: 'published' } => {
  return talent?.lifecycleStatus === 'published';
};

export const getBusinessSelectableTalents = (talents: TalentInfo[]): TalentInfo[] => {
  return talents.filter(isPublishedTalent);
};

export const getSingleManagementOnlyTalent = (
  talents: TalentInfo[]
): TalentInfo | null => {
  if (talents.length !== 1) {
    return null;
  }

  return isPublishedTalent(talents[0]) ? null : talents[0];
};

export const buildOrganizationStructureUrl = (tenantId: string): string => {
  return `/tenant/${tenantId}/organization-structure`;
};

export const buildPathWithSearch = (
  pathname: string | null | undefined,
  search?: string | null
): string | null => {
  if (!pathname) {
    return null;
  }

  if (!search) {
    return pathname;
  }

  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  return normalizedSearch === '?' ? pathname : `${pathname}${normalizedSearch}`;
};

export const classifyTalentWorkspaceRoute = (
  pathname: string | null | undefined
): TalentWorkspaceRouteType => {
  if (!pathname) {
    return 'other';
  }

  if (PUBLISH_GATED_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return 'publish-gated';
  }

  if (UTILITY_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return 'utility';
  }

  return 'other';
};

export const getTalentBusinessBlockedNotice = (
  lifecycleStatus: TalentInfo['lifecycleStatus'] | null | undefined
): TalentBusinessBlockedNotice | null => {
  switch (lifecycleStatus) {
    case 'draft':
      return 'publish-required';
    case 'disabled':
      return 're-enable-required';
    case 'published':
    default:
      return null;
  }
};

export const isTalentBusinessBlockedNotice = (
  value: string | null | undefined
): value is TalentBusinessBlockedNotice => {
  return value === 'publish-required' || value === 're-enable-required';
};

export const buildTalentManagementUrl = ({
  tenantId,
  talentId,
  subsidiaryId,
  destination,
  notice,
  from,
}: BuildTalentManagementUrlOptions): string => {
  const basePath = subsidiaryId
    ? `/tenant/${tenantId}/subsidiary/${subsidiaryId}/talent/${talentId}/${destination}`
    : `/tenant/${tenantId}/talent/${talentId}/${destination}`;
  const query = new URLSearchParams();

  if (notice) {
    query.set('notice', notice);
  }

  if (from) {
    query.set('from', from);
  }

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export const buildTalentDetailsUrl = (
  options: Omit<BuildTalentManagementUrlOptions, 'destination'>
): string => {
  return buildTalentManagementUrl({ ...options, destination: 'details' });
};

export const buildTalentSettingsUrl = (
  options: Omit<BuildTalentManagementUrlOptions, 'destination'>
): string => {
  return buildTalentManagementUrl({ ...options, destination: 'settings' });
};

export const resolveTalentHomeRedirect = ({
  tenantId,
  accessibleTalents,
}: ResolveTalentHomeRedirectOptions): string => {
  const businessSelectableTalents = getBusinessSelectableTalents(accessibleTalents);

  if (businessSelectableTalents.length > 0) {
    return '/customers';
  }

  const singleManagementOnlyTalent = getSingleManagementOnlyTalent(accessibleTalents);
  if (singleManagementOnlyTalent && tenantId) {
    const notice = getTalentBusinessBlockedNotice(singleManagementOnlyTalent.lifecycleStatus);

    return buildTalentDetailsUrl({
      tenantId,
      talentId: singleManagementOnlyTalent.id,
      subsidiaryId: singleManagementOnlyTalent.subsidiaryId,
      notice: notice ?? undefined,
    });
  }

  if (tenantId) {
    return buildOrganizationStructureUrl(tenantId);
  }

  return '/profile';
};

export const resolveBusinessWorkspaceEntry = ({
  tenantId,
  pathname,
  search,
  accessibleTalents,
  currentTalent,
}: ResolveBusinessWorkspaceEntryOptions): BusinessWorkspaceEntryDecision => {
  const routeType = classifyTalentWorkspaceRoute(pathname);

  if (routeType !== 'publish-gated') {
    return { type: 'allow' };
  }

  const from = buildPathWithSearch(pathname, search) ?? undefined;

  if (currentTalent) {
    if (isPublishedTalent(currentTalent)) {
      return { type: 'allow' };
    }

    if (tenantId) {
      const notice = getTalentBusinessBlockedNotice(currentTalent.lifecycleStatus);

      return {
        type: 'redirect',
        href: buildTalentDetailsUrl({
          tenantId,
          talentId: currentTalent.id,
          subsidiaryId: currentTalent.subsidiaryId,
          notice: notice ?? undefined,
          from,
        }),
      };
    }

    return { type: 'redirect', href: '/profile' };
  }

  const businessSelectableTalents = getBusinessSelectableTalents(accessibleTalents);
  if (businessSelectableTalents.length === 1) {
    return { type: 'auto-select', talent: businessSelectableTalents[0] };
  }

  if (businessSelectableTalents.length > 1) {
    return { type: 'show-modal', talents: businessSelectableTalents };
  }

  const singleManagementOnlyTalent = getSingleManagementOnlyTalent(accessibleTalents);
  if (singleManagementOnlyTalent && tenantId) {
    const notice = getTalentBusinessBlockedNotice(singleManagementOnlyTalent.lifecycleStatus);

    return {
      type: 'redirect',
      href: buildTalentDetailsUrl({
        tenantId,
        talentId: singleManagementOnlyTalent.id,
        subsidiaryId: singleManagementOnlyTalent.subsidiaryId,
        notice: notice ?? undefined,
        from,
      }),
    };
  }

  return {
    type: 'redirect',
    href: tenantId ? buildOrganizationStructureUrl(tenantId) : '/profile',
  };
};
