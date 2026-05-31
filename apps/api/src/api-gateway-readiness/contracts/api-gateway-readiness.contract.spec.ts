import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const apiRoot = path.resolve(__dirname, '../../..');
const registry = {
  registryVersion: '2026-05-31.phase-9',
  sourceCommit: 'phase10-test',
  operations: [
    {
      operationCode: 'public.fan_page_read',
      method: 'GET',
      pathTemplate: '/public/talents/{talentId}/homepage',
      exposure: 'public',
      scopeType: 'public',
      authMode: 'public',
      requiredPermissions: [],
      ownerModuleCode: 'public_presence',
      ownerCapabilityCode: 'public_presence.homepage',
      gatewayEligible: true,
      metadataAuthority: {
        kind: 'tcrn_api_registry_authority_snapshot',
        source: 'apps/api/src/modules/public/public.controller.ts',
        operationKey: 'public GET /public/talents/{talentId}/homepage',
      },
      source: {
        openapiFile: 'openapi-before/openapi-public.json',
      },
    },
    {
      operationCode: 'config.api_gateway_readiness_controller_get_summary',
      method: 'GET',
      pathTemplate: '/api-gateway-readiness/summary',
      exposure: 'ac_only',
      scopeType: 'ac_platform',
      authMode: 'bearer_jwt',
      requiredPermissions: [{ resource: 'platform.api_gateway', action: 'read' }],
      ownerModuleCode: 'platform',
      ownerCapabilityCode: 'platform.ac_management',
      gatewayEligible: false,
      metadataAuthority: {
        kind: 'tcrn_api_registry_authority_snapshot',
        source: 'apps/api/src/modules/api-gateway-readiness/api-gateway-readiness.controller.ts',
        operationKey: 'config GET /api-gateway-readiness/summary',
      },
      source: {
        openapiFile: 'openapi-before/openapi-config.json',
      },
    },
  ],
};
const phase9Manifest = {
  manifestVersion: '2026-05-31.phase-9',
  generatedFromRegistryVersion: '2026-05-31.phase-9',
  routes: [
    {
      operationCode: 'public.fan_page_read',
      method: 'GET',
      pathTemplate: '/public/talents/{talentId}/homepage',
      upstreamService: 'tcrn-api',
      authPolicyRefs: ['public-readonly'],
      rateLimitHints: ['public-readonly-default'],
      oidcHints: [],
      canaryEligible: true,
      rollbackNotes: 'Phase 9 dry-run',
      notAppliedReason: 'phase_9_readiness_only',
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

describe('API Gateway Readiness policy contracts', () => {
  it('derives Phase 10 route policy from the Phase 9 manifest without enabling cutover', () => {
    const policy = runModuleScript<{
      routes: Array<{ cutoverDefault: boolean; notAppliedReason: string; routeSource: string }>;
      passed: boolean;
    }>(`
      import { buildGatewayRoutePolicy } from './scripts/api-gateway-readiness-script-utils.mjs';
      process.stdout.write(JSON.stringify(buildGatewayRoutePolicy(${JSON.stringify(registry)}, ${JSON.stringify(phase9Manifest)})));
    `);

    expect(policy.routes).toHaveLength(1);
    expect(policy.routes[0]).toMatchObject({
      cutoverDefault: false,
      notAppliedReason: 'phase_10_readiness_only',
      routeSource: 'phase_9_api_registry_manifest',
    });
    expect(policy.passed).toBe(true);
  });

  it('fails route validation when a readiness route tries to enable cutover', () => {
    const errors = runModuleScript<string[]>(`
      import { validateGatewayRoutePolicyRoutes } from './scripts/api-gateway-readiness-script-utils.mjs';
      const policy = ${JSON.stringify(phase9Manifest.routes[0])};
      policy.cutoverDefault = true;
      policy.notAppliedReason = 'phase_10_readiness_only';
      policy.upstreamService = 'tcrn-api';
      process.stdout.write(JSON.stringify(validateGatewayRoutePolicyRoutes([policy])));
    `);

    expect(errors).toEqual([
      'public.fan_page_read: cutoverDefault must be false',
    ]);
  });

  it('fails policy generation when the Phase 9 manifest contains an orphan route', () => {
    const orphanManifest = {
      ...phase9Manifest,
      routes: [
        ...phase9Manifest.routes,
        {
          ...phase9Manifest.routes[0],
          operationCode: 'unknown.orphan_operation',
        },
      ],
    };
    const policy = runModuleScript<{
      passed: boolean;
      registryJoin: { unknownOperationCodes: string[] };
      warnings: string[];
    }>(`
      import { buildGatewayRoutePolicy } from './scripts/api-gateway-readiness-script-utils.mjs';
      process.stdout.write(JSON.stringify(buildGatewayRoutePolicy(${JSON.stringify(registry)}, ${JSON.stringify(orphanManifest)})));
    `);

    expect(policy.passed).toBe(false);
    expect(policy.registryJoin.unknownOperationCodes).toEqual(['unknown.orphan_operation']);
    expect(policy.warnings.join('\n')).toContain('manifest operation is not present in API Registry');
  });

  it('fails policy generation when the Phase 9 manifest is stale', () => {
    const staleManifest = {
      ...phase9Manifest,
      generatedFromRegistryVersion: '2026-05-30.phase-9',
    };
    const policy = runModuleScript<{
      passed: boolean;
      registryJoin: { versionMismatches: string[] };
    }>(`
      import { buildGatewayRoutePolicy } from './scripts/api-gateway-readiness-script-utils.mjs';
      process.stdout.write(JSON.stringify(buildGatewayRoutePolicy(${JSON.stringify(registry)}, ${JSON.stringify(staleManifest)})));
    `);

    expect(policy.passed).toBe(false);
    expect(policy.registryJoin.versionMismatches[0]).toContain('generatedFromRegistryVersion');
  });

  it('keeps trusted proxy and auth headers under application authority', () => {
    const report = runModuleScript<{ passed: boolean; missingStrippedHeaders: string[] }>(`
      import { buildGatewayRoutePolicy, verifyGatewayTrustedProxyPolicy } from './scripts/api-gateway-readiness-script-utils.mjs';
      const policy = buildGatewayRoutePolicy(${JSON.stringify(registry)}, ${JSON.stringify(phase9Manifest)});
      process.stdout.write(JSON.stringify(verifyGatewayTrustedProxyPolicy(policy)));
    `);

    expect(report.passed).toBe(true);
    expect(report.missingStrippedHeaders).toEqual([]);
  });

  it('renders APISIX first and Kong compatibility artifacts without apply commands', () => {
    const validation = runModuleScript<{
      artifacts: Array<{ provider: string; passed: boolean; parsed: any }>;
      passed: boolean;
    }>(`
      import { buildGatewayRoutePolicy, renderGatewayArtifact } from './scripts/api-gateway-readiness-script-utils.mjs';
      const policy = buildGatewayRoutePolicy(${JSON.stringify(registry)}, ${JSON.stringify(phase9Manifest)});
      process.stdout.write(JSON.stringify({
        artifacts: ['apisix', 'kong'].map((provider) => {
          const artifact = renderGatewayArtifact(provider, policy);
          return { provider, passed: artifact.passed, parsed: JSON.parse(artifact.content) };
        }),
        passed: ['apisix', 'kong'].every((provider) => renderGatewayArtifact(provider, policy).passed),
      }));
    `);

    expect(validation.artifacts.map((artifact) => artifact.provider)).toEqual(['apisix', 'kong']);
    expect(validation.artifacts.every((artifact) => artifact.passed)).toBe(true);
    expect(validation.artifacts[0].parsed.routes[0].plugins['proxy-rewrite'].headers.remove).toContain('x-tenant-id');
    expect(validation.artifacts[1].parsed._format_version).toBe('3.0');
    expect(validation.artifacts[1].parsed.plugins[0].config.remove.headers).toContain('authorization');
    expect(validation.passed).toBe(true);
  });
});
