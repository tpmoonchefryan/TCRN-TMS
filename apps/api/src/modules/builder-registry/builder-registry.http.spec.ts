import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import 'reflect-metadata';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { bootstrapTestApp } from '../../testing/bootstrap-test-app';
import { AuthService } from '../auth/auth.service';
import { ApiRegistryService } from '../api-registry/api-registry.service';
import { PermissionSnapshotService } from '../permission/permission-snapshot.service';
import { TenantMiddleware } from '../tenant/tenant.middleware';
import { TenantService } from '../tenant/tenant.service';
import { BuilderRegistryController } from './builder-registry.controller';
import { BuilderRegistryService } from './builder-registry.service';

const AC_TENANT_ID = '00000000-0000-0000-0000-0000000000ac';
const STANDARD_TENANT_ID = '00000000-0000-0000-0000-0000000000aa';

function buildTenantService() {
  return {
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
    getTenantByCode: vi.fn(async (tenantCode: string) => {
      if (tenantCode === 'AC') {
        return {
          id: AC_TENANT_ID,
          code: 'AC',
          schemaName: 'tenant_ac',
          tier: 'ac',
          isActive: true,
        };
      }

      if (tenantCode === 'STD') {
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
    setTenantContext: vi.fn(async () => undefined),
  };
}

function bearer(token: string) {
  return `Bearer ${token}`;
}

describe('BuilderRegistryController HTTP acceptance boundary', () => {
  let app: INestApplication;
  let builderRegistryService: BuilderRegistryService;

  beforeEach(async () => {
    const tenantService = buildTenantService();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BuilderRegistryController],
      providers: [
        ApiRegistryService,
        BuilderRegistryService,
        {
          provide: AuthService,
          useValue: {
            verifyAccessToken: vi.fn(async (token: string) => {
              if (token === 'ac-token') {
                return {
                  sub: 'ac-user',
                  tid: AC_TENANT_ID,
                  tsc: 'tenant_ac',
                  email: 'ac.operator@example.com',
                  username: 'ac.operator',
                };
              }

              if (token === 'ac-no-permission-token') {
                return {
                  sub: 'ac-no-permission',
                  tid: AC_TENANT_ID,
                  tsc: 'tenant_ac',
                  email: 'ac.no.permission@example.com',
                  username: 'ac.no.permission',
                };
              }

              if (token === 'ordinary-platform-token') {
                return {
                  sub: 'ordinary-platform',
                  tid: STANDARD_TENANT_ID,
                  tsc: 'tenant_standard',
                  email: 'ordinary.operator@example.com',
                  username: 'ordinary.operator',
                };
              }

              throw new Error('invalid token');
            }),
          },
        },
        {
          provide: PermissionSnapshotService,
          useValue: {
            refreshAndCheckPermission: vi.fn(async (_schema, userId: string) => {
              return userId === 'ac-user' || userId === 'ordinary-platform';
            }),
          },
        },
        {
          provide: TenantService,
          useValue: tenantService,
        },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionGuard,
        },
      ],
    }).compile();

    builderRegistryService = moduleFixture.get(BuilderRegistryService);
    app = moduleFixture.createNestApplication();
    const tenantMiddleware = new TenantMiddleware(tenantService as unknown as TenantService);
    app.use((req: Request, res: Response, next: NextFunction) => {
      void tenantMiddleware.use(req, res, next);
    });
    await bootstrapTestApp(app);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('allows AC operators to read summary and generated artifacts with no-store headers', async () => {
    const summaryResponse = await request(app.getHttpServer())
      .get('/api/v1/builder-registry/summary')
      .set('Authorization', bearer('ac-token'));

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.success).toBe(true);
    expect(summaryResponse.body.data.registryVersion).toBe('2026-05-31.phase-11');

    const artifactResponse = await request(app.getHttpServer())
      .get('/api/v1/builder-registry/artifacts/manifest')
      .set('Authorization', bearer('ac-token'));

    expect(artifactResponse.status).toBe(200);
    expect(artifactResponse.get('cache-control')).toContain('no-store');
    expect(artifactResponse.get('cache-control')).toContain('private');
    expect(artifactResponse.body.success).toBe(true);
    expect(artifactResponse.body.data.fileName).toBe('builder-module-capability-manifest.json');
  });

  it('denies AC operators without permission without leaking Builder Registry internals', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/builder-registry/summary')
      .set('Authorization', bearer('ac-no-permission-token'));

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('Permission denied');
    expect(JSON.stringify(response.body)).not.toMatch(
      /Builder Registry|manifest|artifact|platform\.builder_registry/i
    );
  });

  it('denies ordinary tenants even when X-Tenant-ID spoofs the AC tenant context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/builder-registry/summary')
      .set('Authorization', bearer('ordinary-platform-token'))
      .set('X-Tenant-ID', AC_TENANT_ID);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('Access denied');
    expect(JSON.stringify(response.body)).not.toMatch(
      /Builder Registry|manifest|artifact|platform\.builder_registry/i
    );
  });

  it('keeps generated artifact downloads unavailable when readiness or redaction gates fail', async () => {
    vi.spyOn(builderRegistryService, 'getArtifactStatus').mockReturnValueOnce({
      artifactKind: 'manifest',
      status: 'disabled',
      fileName: 'builder-module-capability-manifest.json',
      contentHash: '',
      disabledReason: 'Redaction failed',
      redactionStatus: 'failed',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/builder-registry/artifacts/manifest')
      .set('Authorization', bearer('ac-token'));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('Redaction failed');
  });

  it('does not expose write routes on the Builder Registry HTTP surface', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/builder-registry/summary')
      .set('Authorization', bearer('ac-token'))
      .send({});

    expect(response.status).toBe(404);
  });
});
