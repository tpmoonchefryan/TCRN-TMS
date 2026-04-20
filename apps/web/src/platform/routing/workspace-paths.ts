export interface WorkspaceSessionLike {
  tenantId: string;
  tenantTier?: string | null;
}

export type TalentWorkspaceSection = 'overview' | 'customers' | 'homepage' | 'marshmallow' | 'reports' | 'settings';
export type TalentSettingsSection = 'details' | 'config-entities' | 'settings' | 'dictionary';
export type TalentSettingsFocus = 'homepage-routing' | 'marshmallow-routing';

export interface TalentWorkspaceRoute {
  tenantId: string;
  talentId: string;
  section: TalentWorkspaceSection;
}

export interface TalentSettingsPathOptions {
  section?: TalentSettingsSection;
  focus?: TalentSettingsFocus;
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

export function buildTenantUserManagementPath(tenantId: string) {
  return `/tenant/${tenantId}/user-management`;
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

export function buildTalentHomepageEditorPath(tenantId: string, talentId: string) {
  return `${buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage')}/editor`;
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

function normalizeInternalWorkspacePath(path: string | null | undefined) {
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
