export interface WorkspaceSessionLike {
  tenantId: string;
  tenantTier?: string | null;
}

export type TalentWorkspaceSection = 'overview' | 'customers' | 'homepage' | 'marshmallow' | 'reports' | 'settings';
export type TalentSettingsSection = 'details' | 'config-entities' | 'settings' | 'dictionary';
export type TalentSettingsFocus = 'homepage-routing' | 'marshmallow-routing';
export type PublicPresenceHomepageSurface = 'management' | 'templates' | 'components';
export type PublicPresenceStudioFocus = 'overview' | 'release' | 'countdown';
export type PublicPresenceAssetIdeKind = 'template' | 'component';

export interface TalentWorkspaceRoute {
  tenantId: string;
  talentId: string;
  section: TalentWorkspaceSection;
}

export interface HierarchyBusinessRoute {
  tenantId: string;
  scopeType: 'tenant' | 'subsidiary';
  subsidiaryId: string | null;
}

export interface TalentSettingsPathOptions {
  section?: TalentSettingsSection;
  focus?: TalentSettingsFocus;
}

export interface PublicPresenceAssetIdePathOptions {
  scopeId?: string | null;
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
}

const TALENT_WORKSPACE_SECTIONS: readonly TalentWorkspaceSection[] = [
  'overview',
  'customers',
  'homepage',
  'marshmallow',
  'reports',
  'settings',
];

export function isAcTenantTier(tier: string | null | undefined) {
  return tier === 'ac';
}

export function buildTenantWorkspacePath(tenantId: string) {
  return `/tenant/${tenantId}`;
}

export function buildTenantSettingsPath(
  tenantId: string,
  section?: TalentSettingsSection,
) {
  const params = new URLSearchParams();

  if (section) {
    params.set('section', section);
  }

  const query = params.toString();
  const path = `${buildTenantWorkspacePath(tenantId)}/settings`;

  return query ? `${path}?${query}` : path;
}

export function buildTenantOrganizationStructurePath(tenantId: string) {
  return `${buildTenantWorkspacePath(tenantId)}/organization-structure`;
}

export function buildTenantUserManagementPath(tenantId: string) {
  return `/tenant/${tenantId}/user-management`;
}

export function buildTenantBusinessPath(tenantId: string) {
  return `/tenant/${tenantId}/business`;
}

export function buildSubsidiaryBusinessPath(tenantId: string, subsidiaryId: string) {
  return `/tenant/${tenantId}/subsidiary/${subsidiaryId}/business`;
}

export function buildSubsidiarySettingsPath(
  tenantId: string,
  subsidiaryId: string,
  section?: TalentSettingsSection,
) {
  const params = new URLSearchParams();

  if (section) {
    params.set('section', section);
  }

  const query = params.toString();
  const path = `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings`;

  return query ? `${path}?${query}` : path;
}

export function buildTenantUserCreatePath(tenantId: string) {
  return `${buildTenantUserManagementPath(tenantId)}/new`;
}

export function buildTenantUserEditorPath(tenantId: string, systemUserId: string) {
  return `${buildTenantUserManagementPath(tenantId)}/${systemUserId}`;
}

export function buildTenantRoleCreatePath(tenantId: string) {
  return `${buildTenantUserManagementPath(tenantId)}/roles/new`;
}

export function buildTenantRoleEditorPath(tenantId: string, systemRoleId: string) {
  return `${buildTenantUserManagementPath(tenantId)}/roles/${systemRoleId}`;
}

export function buildTenantProfilePath(tenantId: string) {
  return `/tenant/${tenantId}/profile`;
}

export function buildTenantProfileSecurityPath(tenantId: string) {
  return `${buildTenantProfilePath(tenantId)}/security`;
}

export function buildTalentWorkspacePath(tenantId: string, talentId: string) {
  return `/tenant/${tenantId}/talent/${talentId}`;
}

export function buildTalentWorkspaceSectionPath(
  tenantId: string,
  talentId: string,
  section: TalentWorkspaceSection,
) {
  if (section === 'overview') {
    return buildTalentWorkspacePath(tenantId, talentId);
  }

  return `${buildTalentWorkspacePath(tenantId, talentId)}/${section}`;
}

export function buildPublicPresenceStudioEditorPath(
  tenantId: string,
  talentId: string,
  templateId?: string | null,
  focus?: PublicPresenceStudioFocus | null,
) {
  const params = new URLSearchParams();

  if (templateId) {
    params.set('templateId', templateId);
  }

  if (focus) {
    params.set('focus', focus);
  }

  const query = params.toString();
  const path = `/studio/public-presence/${tenantId}/${talentId}`;

  return query ? `${path}?${query}` : path;
}

export function mergePathSearchParams(
  path: string,
  updates: Record<string, string | null | undefined>,
) {
  const url = new URL(path, 'https://tcrn.local');

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, value);
  });

  const query = url.searchParams.toString();

  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function buildPublicPresenceHomepageSurfacePath(
  tenantId: string,
  talentId: string,
  surface: PublicPresenceHomepageSurface = 'management',
) {
  void surface;
  const path = buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage');

  return path;
}

export function buildPublicPresenceAssetIdePath(
  tenantId: string,
  assetKind: PublicPresenceAssetIdeKind,
  assetId: string,
  options: PublicPresenceAssetIdePathOptions = {},
) {
  const params = new URLSearchParams();

  if (options.scopeType) {
    params.set('scopeType', options.scopeType);
  }

  if (options.scopeId) {
    params.set('scopeId', options.scopeId);
  }

  const query = params.toString();
  const path = `/studio/public-presence/${tenantId}/assets/${assetKind}/${assetId}`;

  return query ? `${path}?${query}` : path;
}

export function buildPublicPresenceStudioPreviewPath(
  tenantId: string,
  talentId: string,
  templateId?: string | null,
) {
  const params = new URLSearchParams();

  if (templateId) {
    params.set('templateId', templateId);
  }

  const query = params.toString();
  const path = `/studio/public-presence/${tenantId}/${talentId}/preview`;

  return query ? `${path}?${query}` : path;
}

export function buildTalentSettingsPath(
  tenantId: string,
  talentId: string,
  options: TalentSettingsPathOptions = {},
) {
  const params = new URLSearchParams();

  if (options.section) {
    params.set('section', options.section);
  }

  if (options.focus) {
    params.set('focus', options.focus);
  }

  const query = params.toString();
  const path = buildTalentWorkspaceSectionPath(tenantId, talentId, 'settings');

  return query ? `${path}?${query}` : path;
}

export function buildAcWorkspacePath(tenantId: string) {
  return `/ac/${tenantId}/tenants`;
}

export function buildAcUserManagementPath(tenantId: string) {
  return `/ac/${tenantId}/user-management`;
}

export function buildAcUserCreatePath(tenantId: string) {
  return `${buildAcUserManagementPath(tenantId)}/new`;
}

export function buildAcUserEditorPath(tenantId: string, systemUserId: string) {
  return `${buildAcUserManagementPath(tenantId)}/${systemUserId}`;
}

export function buildAcRoleCreatePath(tenantId: string) {
  return `${buildAcUserManagementPath(tenantId)}/roles/new`;
}

export function buildAcRoleEditorPath(tenantId: string, systemRoleId: string) {
  return `${buildAcUserManagementPath(tenantId)}/roles/${systemRoleId}`;
}

export function buildAcProfilePath(tenantId: string) {
  return `/ac/${tenantId}/profile`;
}

export function buildAcProfileSecurityPath(tenantId: string) {
  return `${buildAcProfilePath(tenantId)}/security`;
}

export function resolveTalentWorkspaceRoute(pathname: string): TalentWorkspaceRoute | null {
  const matched = pathname.match(/^\/tenant\/([^/]+)\/talent\/([^/]+)(?:\/([^/]+))?/);

  if (!matched) {
    return null;
  }

  const [, tenantId, talentId, rawSection] = matched;
  const section = (rawSection ?? 'overview') as TalentWorkspaceSection;

  if (!TALENT_WORKSPACE_SECTIONS.includes(section)) {
    return null;
  }

  return {
    tenantId,
    talentId,
    section,
  };
}

export function resolveHierarchyBusinessRoute(pathname: string): HierarchyBusinessRoute | null {
  const subsidiaryMatch = pathname.match(/^\/tenant\/([^/]+)\/subsidiary\/([^/]+)\/business(?:\/|$)/);

  if (subsidiaryMatch) {
    const [, tenantId, subsidiaryId] = subsidiaryMatch;

    return {
      tenantId,
      scopeType: 'subsidiary',
      subsidiaryId,
    };
  }

  const tenantMatch = pathname.match(/^\/tenant\/([^/]+)\/business(?:\/|$)/);

  if (!tenantMatch) {
    return null;
  }

  const [, tenantId] = tenantMatch;

  return {
    tenantId,
    scopeType: 'tenant',
    subsidiaryId: null,
  };
}

export function buildDefaultWorkspacePath(session: WorkspaceSessionLike) {
  return isAcTenantTier(session.tenantTier)
    ? buildAcWorkspacePath(session.tenantId)
    : buildTenantWorkspacePath(session.tenantId);
}

export function resolvePostLoginPath(nextHref: string | null | undefined, session: WorkspaceSessionLike) {
  const safeNextHref = normalizeInternalWorkspacePath(nextHref);

  if (safeNextHref) {
    return safeNextHref;
  }

  return buildDefaultWorkspacePath(session);
}

export function resolveRecoveryTenantId(
  previousTenantId?: string | null,
  requestedTenantId?: string | null,
) {
  return previousTenantId || requestedTenantId || null;
}

export function normalizeInternalWorkspacePath(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const trimmedPath = path.trim();

  if (!trimmedPath.startsWith('/')) {
    return null;
  }

  try {
    const resolved = new URL(trimmedPath, 'https://tcrn.local');

    if (resolved.origin !== 'https://tcrn.local') {
      return null;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}
