import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ApiRegistryService } from '../api-registry/api-registry.service';
import { ApiGatewayReadinessController } from './api-gateway-readiness.controller';
import { ApiGatewayReadinessService } from './api-gateway-readiness.service';

function buildRequest(tier: string | null) {
  return {
    tenantContext: tier
      ? {
          tenantId: '00000000-0000-0000-0000-0000000000ac',
          schemaName: 'tenant_ac',
          tier,
        }
      : null,
    headers: {
      'x-tenant-id': 'spoofed-tenant',
      'x-real-ip': '203.0.113.10',
      'cf-connecting-ip': '203.0.113.11',
      'x-forwarded-for': '203.0.113.12',
    },
  } as never;
}

function buildController() {
  const registryService = new ApiRegistryService();
  const readinessService = new ApiGatewayReadinessService(registryService);
  return new ApiGatewayReadinessController(readinessService);
}

describe('ApiGatewayReadinessController', () => {
  it('reads summary, route policy, rendered artifacts, and runbook for AC tenant context', () => {
    const controller = buildController();
    const request = buildRequest('ac');

    const summary = controller.getSummary(request);
    const routePolicy = controller.getRoutePolicy(request);
    const apisix = controller.getRenderedArtifact('apisix', request);
    const kong = controller.getRenderedArtifact('kong', request);
    const runbook = controller.getCutoverRunbook(request);

    expect(summary.routePolicy.routes.length).toBeGreaterThan(0);
    expect(summary.routeDriftReport.unknownOperationCount).toBe(0);
    expect(summary.routeDriftReport.missingManifestRouteCount).toBe(0);
    expect(summary.routeDriftReport.versionMismatchCount).toBe(0);
    expect(routePolicy.registryJoin.unknownOperationCodes).toEqual([]);
    expect(routePolicy.registryJoin.missingManifestOperationCodes).toEqual([]);
    expect(routePolicy.routes.some((route) => route.authMode === 'bearer_jwt' && route.oidcHints.length > 0)).toBe(true);
    expect(JSON.parse(apisix.content).routes[0].plugins['proxy-rewrite'].headers.remove).toContain('x-tenant-id');
    expect(JSON.parse(kong.content).plugins[0].config.remove.headers).toContain('authorization');
    expect(`${apisix.content}\n${kong.content}`).not.toMatch(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}|otpauth:\/\//i);
    expect(runbook.readinessOnly).toBe(true);
  });

  it.each([['standard'], [null]])('denies non-AC tenant context %s', (tier) => {
    const controller = buildController();

    expect(() => controller.getSummary(buildRequest(tier))).toThrow(ForbiddenException);
    expect(() => controller.getRoutePolicy(buildRequest(tier))).toThrow(ForbiddenException);
    expect(() => controller.getRenderedArtifact('apisix', buildRequest(tier))).toThrow(ForbiddenException);
    expect(() => controller.getCutoverRunbook(buildRequest(tier))).toThrow(ForbiddenException);
  });

  it('denies unsupported rendered artifact providers', () => {
    const controller = buildController();

    expect(() => controller.getRenderedArtifact('tyk' as never, buildRequest('ac'))).toThrow(ForbiddenException);
  });
});
