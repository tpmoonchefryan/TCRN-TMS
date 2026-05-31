import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { ApiRegistryService } from '../api-registry/api-registry.service';
import type { TenantService } from '../tenant/tenant.service';
import { BuilderRegistryController } from './builder-registry.controller';
import { BuilderRegistryService } from './builder-registry.service';

const AC_TENANT_ID = '00000000-0000-0000-0000-0000000000ac';
const STANDARD_TENANT_ID = '00000000-0000-0000-0000-0000000000aa';

function buildRequest(options: {
  userTenantId?: string;
  userTenantSchema?: string;
  tenantContext?: {
    tenantId: string;
    schemaName: string;
    tier: string;
  } | null;
} = {}): Request {
  const userTenantId = options.userTenantId ?? AC_TENANT_ID;
  const userTenantSchema = options.userTenantSchema ?? 'tenant_ac';

  return {
    user: {
      id: 'user-ac',
      tenantId: userTenantId,
      tenantSchema: userTenantSchema,
      email: 'ac.operator@example.com',
      username: 'ac.operator',
    },
    tenantContext:
      options.tenantContext === undefined
        ? {
            tenantId: userTenantId,
            tenantCode: 'AC',
            schemaName: userTenantSchema,
            tier: 'ac',
          }
        : options.tenantContext,
  } as unknown as Request;
}

function buildResponse() {
  const headers = new Map<string, string>();

  return {
    response: {
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value);
      }),
    } as unknown as Response,
    headers,
  };
}

function buildController() {
  const registryService = new ApiRegistryService();
  const builderService = new BuilderRegistryService(registryService);
  const tenantService = {
    getTenantById: vi.fn(async (tenantId: string) => {
      if (tenantId === AC_TENANT_ID) {
        return {
          id: AC_TENANT_ID,
          code: 'AC',
          schemaName: 'tenant_ac',
          tier: 'ac',
          isActive: true,
        };
      }

      if (tenantId === STANDARD_TENANT_ID) {
        return {
          id: STANDARD_TENANT_ID,
          code: 'STD',
          schemaName: 'tenant_standard',
          tier: 'standard',
          isActive: true,
        };
      }

      return null;
    }),
  } as unknown as TenantService;

  return new BuilderRegistryController(builderService, tenantService);
}

describe('BuilderRegistryController', () => {
  it('exposes AC-only read-only Builder Registry summary, modules, artifacts, and dry-run', async () => {
    const controller = buildController();
    const request = buildRequest();
    const { response, headers } = buildResponse();

    const summary = await controller.getSummary(request, 'true');
    const modules = await controller.getModules(request, 'en');
    const manifest = await controller.getArtifact(request, response, 'manifest');
    const sdk = await controller.getArtifact(request, response, 'sdk-readonly');
    const dryRun = await controller.getComposedDryRun(request);

    expect(summary.data.registryVersion).toBe('2026-05-31.phase-11');
    expect(summary.data.operationCount).toBeGreaterThan(0);
    expect(modules.data.rows.length).toBeGreaterThan(0);
    expect(headers.get('cache-control')).toBe('no-store, private');
    expect(manifest.data.cacheControl).toBe('no-store, private');
    expect(sdk.data.content).toContain('BuilderReadonlyRequest');
    expect(sdk.data.content).not.toMatch(/\b(post|patch|put|delete|admin|execute)\w*Request\b/i);
    expect(dryRun.data.operationCode).toBe('builder.acCapabilitySurfaceOverview.read');
    expect(dryRun.data.mode).toBe('dry_run');
  });

  it('localizes Builder Registry module and capability rows for Korean', async () => {
    const controller = buildController();
    const request = buildRequest();

    const modules = await controller.getModules(request, 'ko');
    const visibleText = modules.data.rows
      .map((row) => `${row.moduleName} ${row.capabilityName}`)
      .join(' ');

    expect(visibleText).toContain('공개 프레즌스');
    expect(visibleText).toContain('홈페이지 Studio');
    expect(visibleText).toContain('핵심 작업공간');
    expect(visibleText).toContain('사용자 접근');
    expect(visibleText).not.toMatch(/Public Presence|Homepage Studio|Core Workspace|User Access/);
  });

  it('denies non-AC verified user tenants', async () => {
    const controller = buildController();
    const request = buildRequest({
      userTenantId: STANDARD_TENANT_ID,
      userTenantSchema: 'tenant_standard',
      tenantContext: {
        tenantId: STANDARD_TENANT_ID,
        schemaName: 'tenant_standard',
        tier: 'standard',
      },
    });
    const { response } = buildResponse();

    await expect(controller.getSummary(request, 'false')).rejects.toThrow(ForbiddenException);
    await expect(controller.getModules(request, 'en')).rejects.toThrow(ForbiddenException);
    await expect(controller.getArtifact(request, response, 'manifest')).rejects.toThrow(
      ForbiddenException
    );
    await expect(controller.getComposedDryRun(request)).rejects.toThrow(ForbiddenException);
  });

  it('denies header-derived tenant context that does not match the verified user tenant', async () => {
    const controller = buildController();
    const request = buildRequest({
      userTenantId: STANDARD_TENANT_ID,
      userTenantSchema: 'tenant_standard',
      tenantContext: {
        tenantId: AC_TENANT_ID,
        schemaName: 'tenant_ac',
        tier: 'ac',
      },
    });

    await expect(controller.getSummary(request, 'false')).rejects.toThrow(ForbiddenException);
  });

  it('rejects unsupported artifact kinds and unknown operations safely', async () => {
    const controller = buildController();
    const request = buildRequest();
    const { response } = buildResponse();

    await expect(controller.getArtifact(request, response, 'write-sdk')).rejects.toThrow(
      ConflictException
    );
    await expect(controller.getOperation(request, 'builder.unknown_operation')).rejects.toThrow(
      NotFoundException
    );
  });
});
