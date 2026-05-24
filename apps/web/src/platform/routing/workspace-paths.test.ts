import {
  buildAcProfilePath,
  buildAcProfileSecurityPath,
  buildAcRoleCreatePath,
  buildAcRoleEditorPath,
  buildAcUserCreatePath,
  buildAcUserEditorPath,
  buildAcUserManagementPath,
  buildAcWorkspacePath,
  buildDefaultWorkspacePath,
  buildPublicPresenceAssetIdePath,
  buildPublicPresenceStudioEditorPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioPreviewPath,
  buildSubsidiarySettingsPath,
  mergePathSearchParams,
  buildSubsidiaryBusinessPath,
  buildTalentSettingsPath,
  buildTenantSettingsPath,
  buildTalentWorkspacePath,
  buildTalentWorkspaceSectionPath,
  buildTenantBusinessPath,
  buildTenantOrganizationStructurePath,
  buildTenantProfilePath,
  buildTenantProfileSecurityPath,
  buildTenantRoleCreatePath,
  buildTenantRoleEditorPath,
  buildTenantUserCreatePath,
  buildTenantUserEditorPath,
  buildTenantUserManagementPath,
  buildTenantWorkspacePath,
  resolveHierarchyBusinessRoute,
  resolvePostLoginPath,
  resolveRecoveryTenantId,
  resolveTalentWorkspaceRoute,
} from './workspace-paths';

describe('workspace-paths', () => {
  it('builds the tenant workspace path for standard tenants', () => {
    expect(
      buildDefaultWorkspacePath({
        tenantId: 'tenant-1',
        tenantTier: 'standard',
      }),
    ).toBe('/tenant/tenant-1');
  });

  it('builds the ac workspace path for ac tenants', () => {
    expect(
      buildDefaultWorkspacePath({
        tenantId: 'tenant-ac',
        tenantTier: 'ac',
      }),
    ).toBe('/ac/tenant-ac/tenants');
  });

  it('allows only internal next redirects after login', () => {
    expect(
      resolvePostLoginPath('/tenant/tenant-1/profile?tab=security#totp', {
        tenantId: 'tenant-1',
        tenantTier: 'standard',
      }),
    ).toBe('/tenant/tenant-1/profile?tab=security#totp');

    expect(
      resolvePostLoginPath('https://evil.example/steal', {
        tenantId: 'tenant-1',
        tenantTier: 'standard',
      }),
    ).toBe('/tenant/tenant-1');

    expect(
      resolvePostLoginPath('//evil.example/steal', {
        tenantId: 'tenant-ac',
        tenantTier: 'ac',
      }),
    ).toBe('/ac/tenant-ac/tenants');
  });

  it('exposes the explicit tenant and ac helpers', () => {
    expect(buildTenantWorkspacePath('tenant-2')).toBe('/tenant/tenant-2');
    expect(buildTenantOrganizationStructurePath('tenant-2')).toBe('/tenant/tenant-2/organization-structure');
    expect(buildAcWorkspacePath('tenant-ac-2')).toBe('/ac/tenant-ac-2/tenants');
    expect(buildTenantBusinessPath('tenant-2')).toBe('/tenant/tenant-2/business');
    expect(buildSubsidiaryBusinessPath('tenant-2', 'sub-4')).toBe('/tenant/tenant-2/subsidiary/sub-4/business');
  });

  it('builds profile and security routes for tenant and ac shells', () => {
    expect(buildTenantProfilePath('tenant-2')).toBe('/tenant/tenant-2/profile');
    expect(buildTenantProfileSecurityPath('tenant-2')).toBe('/tenant/tenant-2/profile/security');
    expect(buildAcProfilePath('tenant-ac-2')).toBe('/ac/tenant-ac-2/profile');
    expect(buildAcProfileSecurityPath('tenant-ac-2')).toBe('/ac/tenant-ac-2/profile/security');
  });

  it('builds tenant and ac user-management editor routes', () => {
    expect(buildTenantUserManagementPath('tenant-2')).toBe('/tenant/tenant-2/user-management');
    expect(buildTenantUserCreatePath('tenant-2')).toBe('/tenant/tenant-2/user-management/new');
    expect(buildTenantUserEditorPath('tenant-2', 'user-1')).toBe('/tenant/tenant-2/user-management/user-1');
    expect(buildTenantRoleCreatePath('tenant-2')).toBe('/tenant/tenant-2/user-management/roles/new');
    expect(buildTenantRoleEditorPath('tenant-2', 'role-7')).toBe('/tenant/tenant-2/user-management/roles/role-7');

    expect(buildAcUserManagementPath('tenant-ac-2')).toBe('/ac/tenant-ac-2/user-management');
    expect(buildAcUserCreatePath('tenant-ac-2')).toBe('/ac/tenant-ac-2/user-management/new');
    expect(buildAcUserEditorPath('tenant-ac-2', 'user-4')).toBe('/ac/tenant-ac-2/user-management/user-4');
    expect(buildAcRoleCreatePath('tenant-ac-2')).toBe('/ac/tenant-ac-2/user-management/roles/new');
    expect(buildAcRoleEditorPath('tenant-ac-2', 'role-9')).toBe('/ac/tenant-ac-2/user-management/roles/role-9');
  });

  it('builds talent workspace paths', () => {
    expect(buildTalentWorkspacePath('tenant-3', 'talent-8')).toBe('/tenant/tenant-3/talent/talent-8');
    expect(buildTalentWorkspaceSectionPath('tenant-3', 'talent-8', 'overview')).toBe('/tenant/tenant-3/talent/talent-8');
    expect(buildTalentWorkspaceSectionPath('tenant-3', 'talent-8', 'homepage')).toBe(
      '/tenant/tenant-3/talent/talent-8/homepage',
    );
    expect(buildTalentWorkspaceSectionPath('tenant-3', 'talent-8', 'reports')).toBe(
      '/tenant/tenant-3/talent/talent-8/reports',
    );
    expect(buildPublicPresenceStudioEditorPath('tenant-3', 'talent-8')).toBe(
      '/studio/public-presence/tenant-3/talent-8',
    );
    expect(buildPublicPresenceStudioEditorPath('tenant-3', 'talent-8', 'debutReveal')).toBe(
      '/studio/public-presence/tenant-3/talent-8?templateId=debutReveal',
    );
    expect(buildPublicPresenceStudioEditorPath('tenant-3', 'talent-8', 'debutReveal', 'release')).toBe(
      '/studio/public-presence/tenant-3/talent-8?templateId=debutReveal&focus=release',
    );
    expect(
      mergePathSearchParams(
        buildPublicPresenceStudioEditorPath('tenant-3', 'talent-8', 'activeTalentHub'),
        {
          leftPanel: 'sections',
          stagePanel: 'edit:firstEncounter',
        },
      ),
    ).toBe(
      '/studio/public-presence/tenant-3/talent-8?templateId=activeTalentHub&leftPanel=sections&stagePanel=edit%3AfirstEncounter',
    );
    expect(buildPublicPresenceStudioPreviewPath('tenant-3', 'talent-8', 'activeTalentHub')).toBe(
      '/studio/public-presence/tenant-3/talent-8/preview?templateId=activeTalentHub',
    );
    expect(buildPublicPresenceHomepageSurfacePath('tenant-3', 'talent-8')).toBe(
      '/tenant/tenant-3/talent/talent-8/homepage',
    );
    expect(buildPublicPresenceHomepageSurfacePath('tenant-3', 'talent-8', 'templates')).toBe(
      '/tenant/tenant-3/talent/talent-8/homepage',
    );
    expect(buildPublicPresenceHomepageSurfacePath('tenant-3', 'talent-8', 'components')).toBe(
      '/tenant/tenant-3/talent/talent-8/homepage',
    );
    expect(
      buildPublicPresenceAssetIdePath('tenant-3', 'template', 'asset-1', {
        scopeType: 'tenant',
      }),
    ).toBe('/studio/public-presence/tenant-3/assets/template/asset-1?scopeType=tenant');
    expect(
      buildPublicPresenceAssetIdePath('tenant-3', 'component', 'asset-2', {
        scopeId: 'sub-7',
        scopeType: 'subsidiary',
      }),
    ).toBe('/studio/public-presence/tenant-3/assets/component/asset-2?scopeType=subsidiary&scopeId=sub-7');
  });

  it('builds talent settings paths with optional section focus state', () => {
    expect(buildTenantSettingsPath('tenant-3')).toBe('/tenant/tenant-3/settings');
    expect(buildTenantSettingsPath('tenant-3', 'config-entities')).toBe('/tenant/tenant-3/settings?section=config-entities');
    expect(buildSubsidiarySettingsPath('tenant-3', 'sub-7')).toBe('/tenant/tenant-3/subsidiary/sub-7/settings');
    expect(buildSubsidiarySettingsPath('tenant-3', 'sub-7', 'config-entities')).toBe(
      '/tenant/tenant-3/subsidiary/sub-7/settings?section=config-entities',
    );
    expect(buildTalentSettingsPath('tenant-3', 'talent-8')).toBe('/tenant/tenant-3/talent/talent-8/settings');
    expect(
      buildTalentSettingsPath('tenant-3', 'talent-8', {
        section: 'settings',
        focus: 'marshmallow-routing',
      }),
    ).toBe('/tenant/tenant-3/talent/talent-8/settings?section=settings&focus=marshmallow-routing');
  });

  it('resolves talent workspace routes from pathname', () => {
    expect(resolveTalentWorkspaceRoute('/tenant/tenant-9/talent/talent-5')).toEqual({
      tenantId: 'tenant-9',
      talentId: 'talent-5',
      section: 'overview',
    });

    expect(resolveTalentWorkspaceRoute('/tenant/tenant-9/talent/talent-5/homepage/editor')).toEqual({
      tenantId: 'tenant-9',
      talentId: 'talent-5',
      section: 'homepage',
    });
  });

  it('returns null for non-talent routes and unsupported sections', () => {
    expect(resolveTalentWorkspaceRoute('/tenant/tenant-9/settings')).toBeNull();
    expect(resolveTalentWorkspaceRoute('/tenant/tenant-9/talent/talent-5/inventory')).toBeNull();
  });

  it('resolves hierarchy business routes for tenant and subsidiary scopes', () => {
    expect(resolveHierarchyBusinessRoute('/tenant/tenant-9/business')).toEqual({
      tenantId: 'tenant-9',
      scopeType: 'tenant',
      subsidiaryId: null,
    });

    expect(resolveHierarchyBusinessRoute('/tenant/tenant-9/subsidiary/sub-7/business')).toEqual({
      tenantId: 'tenant-9',
      scopeType: 'subsidiary',
      subsidiaryId: 'sub-7',
    });

    expect(resolveHierarchyBusinessRoute('/tenant/tenant-9/talent/talent-5')).toBeNull();
  });

  it('prefers the previous tenant id during recovery', () => {
    expect(resolveRecoveryTenantId('tenant-stored', 'tenant-requested')).toBe('tenant-stored');
  });

  it('falls back to the requested tenant id during recovery', () => {
    expect(resolveRecoveryTenantId(null, 'tenant-requested')).toBe('tenant-requested');
  });
});
