// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const apiRoot = path.resolve(__dirname, '../..');
const baseOperation = {
  operationCode: 'config.api_registry_controller_get_document',
  method: 'GET',
  pathTemplate: '/api-registry/document',
  documentGroup: 'config',
  authMode: 'bearer_jwt',
  requiredPermissions: [],
  scopeType: 'ac_platform',
  scopeSource: 'AC/platform route family',
  exposure: 'ac_only',
  gatewayEligible: true,
  stability: 'stable',
};

function runModuleScript<T>(source: string): T {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(output) as T;
}

function compareAuthorityWithMutation(mutationSource: string) {
  return runModuleScript<{
    permissionMismatch: string[];
    scopeMismatch: string[];
    exposureMismatch: string[];
    authMismatch: string[];
    groupMismatch: string[];
  }>(`
    import { compareRegistryAuthority } from './scripts/api-registry-script-utils.mjs';
    const operation = ${JSON.stringify(baseOperation)};
    const authority = structuredClone(operation);
    ${mutationSource}
    process.stdout.write(JSON.stringify(compareRegistryAuthority([operation], [authority])));
  `);
}

describe('API registry script authority drift contracts', () => {
  it('fails authority drift when permissions move away from the snapshot', () => {
    const report = compareAuthorityWithMutation(
      "operation.requiredPermissions = [{ resource: 'platform.api_registry', action: 'read' }];"
    );

    expect(report.permissionMismatch).toEqual([
      'config.api_registry_controller_get_document: registry permissions do not match authority snapshot',
    ]);
  });

  it('fails authority drift when scope moves away from the snapshot', () => {
    const report = compareAuthorityWithMutation(
      "operation.scopeType = 'tenant'; operation.scopeSource = 'default authenticated tenant scope';"
    );

    expect(report.scopeMismatch).toEqual([
      'config.api_registry_controller_get_document: registry scope does not match authority snapshot',
    ]);
  });

  it('fails authority drift when exposure moves away from the snapshot', () => {
    const report = compareAuthorityWithMutation("operation.exposure = 'tenant_private';");

    expect(report.exposureMismatch).toEqual([
      'config.api_registry_controller_get_document: registry exposure does not match authority snapshot',
    ]);
  });

  it('fails authority drift when auth mode moves away from the snapshot', () => {
    const report = compareAuthorityWithMutation("operation.authMode = 'public';");

    expect(report.authMismatch).toEqual([
      'config.api_registry_controller_get_document: registry authMode does not match authority snapshot',
    ]);
  });
});

describe('API registry gateway manifest policy contracts', () => {
  it('does not classify public write routes as public-readonly', () => {
    const manifest = runModuleScript<{
      routes: { authPolicyRefs: string[]; rateLimitHints: string[] }[];
      policyViolations: string[];
      passed: boolean;
    }>(`
      import { buildGatewayManifest } from './scripts/api-registry-script-utils.mjs';
      const operation = {
        ...${JSON.stringify(baseOperation)},
        operationCode: 'public.fan_page_submit',
        method: 'POST',
        exposure: 'public',
        authMode: 'public',
        requiredPermissions: [],
      };
      process.stdout.write(JSON.stringify(buildGatewayManifest({
        registryVersion: '2026-05-31.phase-9',
        operations: [operation],
      })));
    `);

    expect(manifest.routes[0]?.authPolicyRefs).toEqual(['public-submit', 'abuse-protection']);
    expect(manifest.routes[0]?.rateLimitHints).toEqual(['public-submit-default']);
    expect(manifest.policyViolations).toEqual([]);
    expect(manifest.passed).toBe(true);
  });

  it('does not classify public auth flows as public-readonly', () => {
    const manifest = runModuleScript<{
      routes: { authPolicyRefs: string[]; rateLimitHints: string[] }[];
      policyViolations: string[];
      passed: boolean;
    }>(`
      import { buildGatewayManifest } from './scripts/api-registry-script-utils.mjs';
      const operation = {
        ...${JSON.stringify(baseOperation)},
        operationCode: 'config.auth_start',
        exposure: 'internal',
        authMode: 'public',
        requiredPermissions: [],
      };
      process.stdout.write(JSON.stringify(buildGatewayManifest({
        registryVersion: '2026-05-31.phase-9',
        operations: [operation],
      })));
    `);

    expect(manifest.routes[0]?.authPolicyRefs).toEqual(['public-auth-flow', 'auth-rate-limit']);
    expect(manifest.routes[0]?.rateLimitHints).toEqual(['auth-flow-default']);
    expect(manifest.policyViolations).toEqual([]);
    expect(manifest.passed).toBe(true);
  });

  it('fails validation if a route is manually marked public-readonly outside public GET/HEAD', () => {
    const policyViolations = runModuleScript<string[]>(`
      import { validateGatewayManifestRoutes } from './scripts/api-registry-script-utils.mjs';
      const operation = {
        ...${JSON.stringify(baseOperation)},
        operationCode: 'public.fan_page_submit',
        method: 'POST',
        exposure: 'public',
      };
      process.stdout.write(JSON.stringify(validateGatewayManifestRoutes([
        {
          operationCode: operation.operationCode,
          method: operation.method,
          authPolicyRefs: ['public-readonly'],
          rateLimitHints: ['public-readonly-default'],
        },
      ], [operation])));
    `);

    expect(policyViolations).toEqual([
      'public.fan_page_submit: public-readonly policy is only valid for public GET/HEAD routes',
    ]);
  });
});
