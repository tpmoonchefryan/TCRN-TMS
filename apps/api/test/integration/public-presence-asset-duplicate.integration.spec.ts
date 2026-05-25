// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PrismaClient } from '@tcrn/database';
import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceTemplateAssetManifest,
  createTestTenantFixture,
  createTestUserInTenant,
  getPublicPresenceTemplateSeedText,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import type { PublicPresenceAssetRepository } from '../../src/modules/homepage/infrastructure/public-presence-asset.repository';
import { loadRepoEnvFiles } from '../../src/repo-env';

loadRepoEnvFiles();

describe('Public Presence asset duplicate integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let repository: PublicPresenceAssetRepository;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;

  const withAuth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${accessToken}`).set('X-Tenant-ID', tenantFixture.tenant.id);

  beforeAll(async () => {
    const [
      { AppModule },
      { PrismaClient },
      { TokenService },
      { PublicPresenceAssetRepository },
      { bootstrapTestApp },
    ] = await Promise.all([
      import('../../src/app.module'),
      import('@tcrn/database'),
      import('../../src/modules/auth/token.service'),
      import('../../src/modules/homepage/infrastructure/public-presence-asset.repository'),
      import('../../src/testing/bootstrap-test-app'),
    ]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    repository = moduleFixture.get(PublicPresenceAssetRepository);
    tenantFixture = await createTestTenantFixture(prisma, 'ppassetdup');
    testUser = await createTestUserInTenant(prisma, tenantFixture, `pp_asset_dup_${Date.now()}`, [
      'ADMIN',
    ]);

    const tokenService = moduleFixture.get(TokenService);
    accessToken = tokenService.generateAccessToken({
      sub: testUser.id,
      tid: testUser.tenantId,
      tsc: testUser.schemaName,
      email: testUser.email,
      username: testUser.username,
    }).token;
  });

  afterAll(async () => {
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('duplicates the system Active Talent Hub template with a non-null current revision', async () => {
    const listResponse = await withAuth(
      request(app.getHttpServer())
        .get('/api/v1/public-presence/assets')
        .query({ assetKind: 'template', scopeType: 'tenant' })
    ).expect(200);

    expect(listResponse.body.success).toBe(true);

    const systemTemplate = listResponse.body.data.find(
      (entry: {
        asset?: { id?: string; ownerType?: string; templateId?: string };
        currentRevision?: { id?: string } | null;
      }) => entry.asset?.ownerType === 'system' && entry.asset?.templateId === 'activeTalentHub'
    );

    expect(systemTemplate?.asset?.id).toBeDefined();
    expect(systemTemplate?.currentRevision?.id).toBeDefined();

    const duplicateCode = `d026-r5-template-${Date.now().toString(36)}`;
    const duplicateResponse = await withAuth(
      request(app.getHttpServer())
        .post(`/api/v1/public-presence/assets/${systemTemplate.asset.id}/duplicate`)
        .query({ scopeType: 'tenant' })
        .send({ code: duplicateCode })
    ).expect(201);

    expect(duplicateResponse.body.success).toBe(true);
    expect(duplicateResponse.body.data.asset).toMatchObject({
      assetKind: 'template',
      code: duplicateCode,
      currentRevisionId: expect.any(String),
      isSystem: false,
      ownerType: 'tenant',
      templateId: 'activeTalentHub',
    });
    expect(duplicateResponse.body.data.currentRevision).toMatchObject({
      assetId: duplicateResponse.body.data.asset.id,
      id: expect.any(String),
    });
  });

  it('duplicates the system SocialLinks component with a non-null current revision', async () => {
    const listResponse = await withAuth(
      request(app.getHttpServer())
        .get('/api/v1/public-presence/assets')
        .query({ assetKind: 'component', scopeType: 'tenant' })
    ).expect(200);

    expect(listResponse.body.success).toBe(true);

    const systemComponent = listResponse.body.data.find(
      (entry: {
        asset?: { id?: string; ownerType?: string; componentType?: string };
        currentRevision?: { id?: string } | null;
      }) => entry.asset?.ownerType === 'system' && entry.asset?.componentType === 'SocialLinks'
    );

    expect(systemComponent?.asset?.id).toBeDefined();
    expect(systemComponent?.currentRevision?.id).toBeDefined();

    const duplicateCode = `d026-r5-component-${Date.now().toString(36)}`;
    const duplicateResponse = await withAuth(
      request(app.getHttpServer())
        .post(`/api/v1/public-presence/assets/${systemComponent.asset.id}/duplicate`)
        .query({ scopeType: 'tenant' })
        .send({ code: duplicateCode })
    ).expect(201);

    expect(duplicateResponse.body.success).toBe(true);
    expect(duplicateResponse.body.data.asset).toMatchObject({
      assetKind: 'component',
      code: duplicateCode,
      componentType: 'SocialLinks',
      currentRevisionId: expect.any(String),
      isSystem: false,
      ownerType: 'tenant',
    });
    expect(duplicateResponse.body.data.currentRevision).toMatchObject({
      assetId: duplicateResponse.body.data.asset.id,
      id: expect.any(String),
    });
  });

  it('rolls back asset creation when current revision persistence fails', async () => {
    const duplicateCode = `d026-r5-rollback-${Date.now().toString(36)}`;
    const seedText = getPublicPresenceTemplateSeedText('activeTalentHub');
    const manifest = buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
      assetCode: duplicateCode,
      description: seedText.description,
      name: seedText.name,
      ownerId: null,
      ownerType: 'tenant',
    });
    const sourceBundle = buildBlankPublicPresenceAssetSourceBundle({
      assetCode: duplicateCode,
      assetKind: 'template',
      manifest,
      name: seedText.name,
      templateId: 'activeTalentHub',
    });

    await expect(
      repository.createAssetWithCurrentRevision(tenantFixture.schemaName, {
        actorId: testUser.id,
        artifactStatus: 'draft',
        assetKind: 'template',
        code: duplicateCode,
        componentType: null,
        description: seedText.description,
        manifest,
        name: seedText.name,
        ownerId: null,
        ownerType: 'tenant',
        sourceBundle,
        sourceHash: 'x'.repeat(65),
        status: 'draft',
        templateId: 'activeTalentHub',
        validationState: 'unvalidated',
        validationSummary: {
          issueCount: 0,
          passCount: 0,
          warnCount: 0,
        },
      })
    ).rejects.toThrow();

    const createdAfterFailure = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        currentRevisionId: string | null;
      }>
    >(
      `
        SELECT
          id,
          current_revision_id as "currentRevisionId"
        FROM "${tenantFixture.schemaName}".public_presence_asset
        WHERE code = $1
        LIMIT 1
      `,
      duplicateCode
    );

    expect(createdAfterFailure).toEqual([]);
  });
});
