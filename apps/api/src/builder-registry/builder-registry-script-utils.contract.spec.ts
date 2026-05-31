import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const apiRoot = path.resolve(__dirname, '../..');

const apiRegistry = {
  registryVersion: '2026-05-31.phase-9',
  sourceCommit: 'phase11-test',
  operations: [
    {
      operationCode: 'operations.permission_controller_get_resources',
      method: 'GET',
      pathTemplate: '/permissions/resources',
      documentGroup: 'operations',
      ownerModuleCode: 'core',
      ownerCapabilityCode: 'core.user_access',
      exposure: 'tenant_private',
      authMode: 'bearer_jwt',
      requiredPermissions: [],
      dynamicPermissionResolver: {
        enabled: false,
        resolverName: null,
        source: null,
        runtimeProofRequired: false,
      },
      scopeType: 'tenant',
      stability: 'stable',
      deprecation: { isDeprecated: false },
      requestSchemaRef: null,
      responseSchemaRefs: ['#/components/schemas/PermissionResourceDto'],
      builderExportEligible: true,
      source: {
        openapiFile: 'openapi/openapi-operations.json',
        operationId: 'PermissionController_getResources',
        controllerFile: 'apps/api/src/modules/permission/permission.controller.ts',
        controllerLine: 1,
      },
    },
    {
      operationCode: 'operations.role_controller_set_permissions',
      method: 'PATCH',
      pathTemplate: '/roles/{roleId}/permissions',
      documentGroup: 'operations',
      ownerModuleCode: 'core',
      ownerCapabilityCode: 'core.user_access',
      exposure: 'tenant_private',
      authMode: 'bearer_jwt',
      requiredPermissions: [{ resource: 'role', action: 'write' }],
      dynamicPermissionResolver: {
        enabled: false,
        resolverName: null,
        source: null,
        runtimeProofRequired: false,
      },
      scopeType: 'tenant',
      stability: 'stable',
      deprecation: { isDeprecated: false },
      requestSchemaRef: '#/components/schemas/RolePermissionUpdateDto',
      responseSchemaRefs: ['#/components/schemas/RoleDto'],
      builderExportEligible: true,
      source: {
        openapiFile: 'openapi/openapi-operations.json',
        operationId: 'RoleController_setPermissions',
        controllerFile: 'apps/api/src/modules/role/role.controller.ts',
        controllerLine: 1,
      },
    },
  ],
};

function runModuleScript<T>(source: string): T {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(output) as T;
}

describe('Builder Registry script contracts', () => {
  it('exports only schema-backed read operations and excludes mutation operations', () => {
    const exportDoc = runModuleScript<{
      operations: Array<{ operationCode: string; method: string }>;
      excludedOperations: Array<{ operationCode: string; reason: string }>;
      passed: boolean;
    }>(`
      import { buildBuilderApiReadonlyExport } from './scripts/builder-registry-script-utils.mjs';
      const sourceReadback = { sourceCommit: 'phase11-test' };
      process.stdout.write(JSON.stringify(buildBuilderApiReadonlyExport(${JSON.stringify(apiRegistry)}, sourceReadback)));
    `);

    expect(exportDoc.passed).toBe(true);
    expect(exportDoc.operations).toEqual([
      expect.objectContaining({
        operationCode: 'operations.permission_controller_get_resources',
        method: 'GET',
      }),
    ]);
    expect(exportDoc.excludedOperations).toEqual([
      expect.objectContaining({
        operationCode: 'operations.role_controller_set_permissions',
        reason: 'write_delete_admin_or_execute_operation',
      }),
    ]);
  });

  it('builds the canonical AC capability surface dry-run without a runtime editor', () => {
    const dryRun = runModuleScript<{
      operationCode: string;
      mode: string;
      nativeOperationRefs: Array<{ ref: string }>;
      passed: boolean;
    }>(`
      import { buildBuilderApiReadonlyExport, buildBuilderModuleCapabilityManifest, buildComposedDryRun } from './scripts/builder-registry-script-utils.mjs';
      const sourceReadback = { sourceCommit: 'phase11-test' };
      const moduleRegistry = { registryVersion: '2026-05-27.phase-1' };
      const apiExport = buildBuilderApiReadonlyExport(${JSON.stringify(apiRegistry)}, sourceReadback);
      const manifest = buildBuilderModuleCapabilityManifest(moduleRegistry, apiExport, sourceReadback);
      process.stdout.write(JSON.stringify(buildComposedDryRun(manifest, apiExport)));
    `);

    expect(dryRun.operationCode).toBe('builder.acCapabilitySurfaceOverview.read');
    expect(dryRun.mode).toBe('dry_run');
    expect(dryRun.nativeOperationRefs.map((ref) => ref.ref)).toContain('permissions.resources.list');
    expect(dryRun.passed).toBe(true);
  });
});
