// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// RBAC contract regression proof for controller/resource/action alignment
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Prisma, PrismaClient } from '@tcrn/database';
import {
  type TenantFixture,
  type TestUser,
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { ExportFormat, ExportJobType } from '../../src/modules/export/dto/export.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
import { removeExportQueueJobsByDataJobIds } from './queue-test-utils';

describe('RBAC Contract Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let talentId: string;
  let tokenService: TokenService;
  let originalBaseDomainConfig: {
    value: Prisma.InputJsonValue;
    description: string | null;
  } | null = null;

  const users = new Map<string, TestUser>();
  const accessTokens = new Map<string, string>();
  const createdExportQueueJobIds = new Set<string>();

  const issueToken = (user: TestUser): string =>
    tokenService.generateAccessToken({
      sub: user.id,
      tid: user.tenantId,
      tsc: user.schemaName,
      email: user.email,
      username: user.username,
    }).token;

  const withAuth = (
    req: request.Test,
    userKey: string,
    options: { includeTalentHeader?: boolean } = {}
  ) => {
    const user = users.get(userKey);
    const accessToken = accessTokens.get(userKey);

    if (!user || !accessToken) {
      throw new Error(`Missing RBAC integration user: ${userKey}`);
    }

    req.set('Authorization', `Bearer ${accessToken}`).set('X-Tenant-ID', tenantFixture.tenant.id);

    if (options.includeTalentHeader) {
      req.set('X-Talent-Id', talentId);
    }

    return req;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    tokenService = moduleFixture.get(TokenService);
    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'rbac');
    const existingBaseDomainConfig = await prisma.globalConfig.findUnique({
      where: { key: 'system.baseDomain' },
      select: { value: true, description: true },
    });
    originalBaseDomainConfig = existingBaseDomainConfig
      ? {
          value: existingBaseDomainConfig.value as Prisma.InputJsonValue,
          description: existingBaseDomainConfig.description,
        }
      : null;
    await prisma.globalConfig.upsert({
      where: { key: 'system.baseDomain' },
      update: {
        value: { domain: 'rbac-contract.tcrn.test' },
        description: 'RBAC contract integration test fixture',
      },
      create: {
        key: 'system.baseDomain',
        value: { domain: 'rbac-contract.tcrn.test' },
        description: 'RBAC contract integration test fixture',
      },
    });

    const contentManager = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `rbac_content_${Date.now()}`,
      ['CONTENT_MANAGER']
    );
    const customerManager = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `rbac_customer_${Date.now()}`,
      ['CUSTOMER_MANAGER']
    );
    const viewer = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `rbac_viewer_${Date.now()}`,
      ['VIEWER']
    );

    users.set('contentManager', contentManager);
    users.set('customerManager', customerManager);
    users.set('viewer', viewer);

    accessTokens.set('contentManager', issueToken(contentManager));
    accessTokens.set('customerManager', issueToken(customerManager));
    accessTokens.set('viewer', issueToken(viewer));

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_RBAC_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'RBAC Contract Subsidiary',
      createdBy: contentManager.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_RBAC_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'RBAC Contract Talent',
      displayName: 'RBAC Contract Talent',
      homepagePath: `rbac-${Date.now()}`,
      createdBy: contentManager.id,
      lifecycleStatus: 'published',
    });

    talentId = talent.id;
  });

  afterAll(async () => {
    if (originalBaseDomainConfig) {
      await prisma.globalConfig.upsert({
        where: { key: 'system.baseDomain' },
        update: {
          value: originalBaseDomainConfig.value,
          description: originalBaseDomainConfig.description,
        },
        create: {
          key: 'system.baseDomain',
          value: originalBaseDomainConfig.value,
          description: originalBaseDomainConfig.description,
        },
      });
    } else {
      await prisma.globalConfig.deleteMany({
        where: { key: 'system.baseDomain' },
      });
    }

    await removeExportQueueJobsByDataJobIds(createdExportQueueJobIds);
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('allows CUSTOMER_MANAGER through the guard on create -> write routes', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/exports'),
      'customerManager',
      { includeTalentHeader: true }
    )
      .send({
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.jobType).toBe(ExportJobType.CUSTOMER_EXPORT);
    createdExportQueueJobIds.add(response.body.data.id);
  });

  it('allows CONTENT_MANAGER through the guard on export -> execute routes', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/talents/${talentId}/marshmallow/export`),
      'contentManager'
    )
      .send({
        format: 'csv',
      })
      .expect(202);

    expect(response.body.success).toBe(true);
    expect(response.body.data.jobId).toBeDefined();
    expect(response.body.data.status).toBe('pending');
    createdExportQueueJobIds.add(response.body.data.jobId);
  });

  it('allows CUSTOMER_MANAGER to read membership configuration routes', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get('/api/v1/configuration-entity/membership-class'),
      'customerManager'
    ).expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
    });
  });

  it('allows CUSTOMER_MANAGER to read consumer configuration routes used by external ID flows', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get('/api/v1/configuration-entity/consumer'),
      'customerManager'
    ).expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('denies CUSTOMER_MANAGER on membership configuration writes', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/configuration-entity/membership-class'),
      'customerManager'
    )
      .send({
        code: 'RBAC_TEST_CLASS',
        nameEn: 'RBAC Test Class',
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PERM_ACCESS_DENIED');
    expect(response.body.error.message).toContain('config.membership:create');
    expect(response.body.error.message).toContain('checked as config.membership:write');
  });

  it('allows CONTENT_MANAGER to read platform config keys needed by custom-domain UI', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get('/api/v1/platform/config/system.baseDomain'),
      'contentManager'
    ).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      key: 'system.baseDomain',
      value: { domain: 'rbac-contract.tcrn.test' },
      description: 'RBAC contract integration test fixture',
    });
  });

  it('denies CUSTOMER_MANAGER on platform config reads without explicit grant', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get('/api/v1/platform/config/system.baseDomain'),
      'customerManager'
    ).expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PERM_ACCESS_DENIED');
    expect(response.body.error.message).toContain('config.platform_settings:read');
  });

  it('returns a truthful forbidden message when alias actions are denied', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/exports'),
      'viewer',
      { includeTalentHeader: true }
    )
      .send({
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PERM_ACCESS_DENIED');
    expect(response.body.error.message).toContain('customer.export:create');
    expect(response.body.error.message).toContain('checked as customer.export:write');
  });

  it('normalizes alias actions in the permission check API', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/permissions/check'),
      'contentManager'
    )
      .send({
        checks: [
          { resource: 'talent.homepage', action: 'update' },
          { resource: 'talent.marshmallow', action: 'export' },
        ],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.results).toEqual([
      {
        resource: 'talent.homepage',
        action: 'update',
        checkedAction: 'write',
        allowed: true,
      },
      {
        resource: 'talent.marshmallow',
        action: 'export',
        checkedAction: 'execute',
        allowed: true,
      },
    ]);
  });

  it('preserves deny semantics for VIEWER on sensitive and write-level checks', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/permissions/check'),
      'viewer'
    )
      .send({
        checks: [
          { resource: 'customer.profile', action: 'read' },
          { resource: 'customer.profile', action: 'update' },
          { resource: 'customer.pii', action: 'read' },
        ],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.results).toEqual([
      {
        resource: 'customer.profile',
        action: 'read',
        checkedAction: 'read',
        allowed: true,
      },
      {
        resource: 'customer.profile',
        action: 'update',
        checkedAction: 'write',
        allowed: false,
      },
      {
        resource: 'customer.pii',
        action: 'read',
        checkedAction: 'read',
        allowed: false,
      },
    ]);
  });
});
