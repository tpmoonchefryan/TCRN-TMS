// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Homepage Public Lifecycle Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let homepagePath: string;

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  const setTalentLifecycle = async (lifecycleStatus: 'published' | 'disabled') => {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET lifecycle_status = $2,
            published_at = CASE
              WHEN $2 IN ('published', 'disabled') THEN COALESCE(published_at, NOW())
              ELSE NULL
            END,
            published_by = CASE
              WHEN $2 IN ('published', 'disabled') THEN $3::uuid
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      talentId,
      lifecycleStatus,
      testUser.id,
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'homepagepublic');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `homepage_public_${Date.now()}`,
      ['ADMIN'],
    );

    const talent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_HOME_PUBLIC_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Homepage Public Lifecycle Talent',
      displayName: 'Homepage Public Lifecycle Talent',
      homepagePath: `homepage-public-${Date.now()}`,
      createdBy: testUser.id,
    });

    talentId = talent.id;
    homepagePath = talent.homepagePath;

    await setTalentLifecycle('published');

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

  it('serves the published homepage for a published talent', async () => {
    await withAuth(
      request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/homepage`),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer()).patch(`/api/v1/talents/${talentId}/homepage/draft`),
    )
      .send({
        content: {
          version: '1.0.0',
          components: [],
        },
      })
      .expect(200);

    await withAuth(
      request(app.getHttpServer()).post(`/api/v1/talents/${talentId}/homepage/publish`),
    )
      .send({})
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/homepage/${homepagePath}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.talent.displayName).toBe('Homepage Public Lifecycle Talent');
    expect(response.body.data.content).toMatchObject({
      version: '1.0.0',
      components: [],
    });
    expect(response.body.data.updatedAt).toBeDefined();
  });

  it('returns 404 for the same homepage after the talent is disabled', async () => {
    await setTalentLifecycle('disabled');

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/homepage/${homepagePath}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RES_NOT_FOUND');
  });
});
