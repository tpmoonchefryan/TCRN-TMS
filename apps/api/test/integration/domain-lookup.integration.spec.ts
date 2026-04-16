// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
} from '@tcrn/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Domain Lookup Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let createdBy: string;
  let publishedDomain: string;
  let publishedHomepagePath: string;
  let publishedMarshmallowPath: string;
  let draftDomain: string;
  let disabledDomain: string;

  const updateTalentPublicRouting = async ({
    talentId,
    customDomain,
    marshmallowPath,
    lifecycleStatus,
  }: {
    talentId: string;
    customDomain: string;
    marshmallowPath: string;
    lifecycleStatus: 'draft' | 'published' | 'disabled';
  }) => {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET custom_domain = $2,
            custom_domain_verified = true,
            marshmallow_path = $3,
            lifecycle_status = $4,
            published_at = CASE
              WHEN $4 IN ('published', 'disabled') THEN COALESCE(published_at, NOW())
              ELSE NULL
            END,
            published_by = CASE
              WHEN $4 IN ('published', 'disabled') THEN $5::uuid
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      talentId,
      customDomain,
      marshmallowPath,
      lifecycleStatus,
      createdBy,
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'domainlookup');
    const testUser = await createTestUserInTenant(prisma, tenantFixture, 'domainlookup_admin');
    createdBy = testUser.id;

    const publishedTalent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_DOMAIN_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Published Domain Lookup Test Talent',
      displayName: 'Published Domain Lookup Test Talent',
      homepagePath: `domain-home-${Date.now()}`,
      createdBy,
    });
    const draftTalent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_DOMAIN_DRAFT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Draft Domain Lookup Test Talent',
      displayName: 'Draft Domain Lookup Test Talent',
      homepagePath: `domain-draft-${Date.now()}`,
      createdBy,
    });
    const disabledTalent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_DOMAIN_DISABLED_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Disabled Domain Lookup Test Talent',
      displayName: 'Disabled Domain Lookup Test Talent',
      homepagePath: `domain-disabled-${Date.now()}`,
      createdBy,
    });

    publishedDomain = `lookup-${Date.now()}.example.com`;
    publishedHomepagePath = publishedTalent.homepagePath;
    publishedMarshmallowPath = `domain-ask-${Date.now()}`;
    draftDomain = `lookup-draft-${Date.now()}.example.com`;
    disabledDomain = `lookup-disabled-${Date.now()}.example.com`;

    await updateTalentPublicRouting({
      talentId: publishedTalent.id,
      customDomain: publishedDomain,
      marshmallowPath: publishedMarshmallowPath,
      lifecycleStatus: 'published',
    });
    await updateTalentPublicRouting({
      talentId: draftTalent.id,
      customDomain: draftDomain,
      marshmallowPath: `draft-ask-${Date.now()}`,
      lifecycleStatus: 'draft',
    });
    await updateTalentPublicRouting({
      talentId: disabledTalent.id,
      customDomain: disabledDomain,
      marshmallowPath: `disabled-ask-${Date.now()}`,
      lifecycleStatus: 'disabled',
    });
  });

  afterAll(async () => {
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('returns homepage and marshmallow paths for the query-based public lookup endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/domain-lookup')
      .query({ domain: publishedDomain.toUpperCase() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      path: publishedHomepagePath,
      type: 'homepage',
      homepagePath: publishedHomepagePath,
      marshmallowPath: publishedMarshmallowPath,
    });
  });

  it('returns success-wrapped routing data for the path-based public lookup endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/domain-lookup/${publishedDomain.toUpperCase()}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      talentPath: publishedHomepagePath,
      homepagePath: publishedHomepagePath,
      marshmallowPath: publishedMarshmallowPath,
    });
  });

  it('returns 404 instead of 500 when a custom domain is not found', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/domain-lookup')
      .query({ domain: 'missing-domain.example.com' })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RES_NOT_FOUND');
  });

  it('returns 404 for a draft talent custom domain', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/domain-lookup')
      .query({ domain: draftDomain })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RES_NOT_FOUND');
  });

  it('returns 404 for a disabled talent custom domain on both lookup endpoints', async () => {
    const queryResponse = await request(app.getHttpServer())
      .get('/api/v1/public/domain-lookup')
      .query({ domain: disabledDomain })
      .expect(404);
    const pathResponse = await request(app.getHttpServer())
      .get(`/api/v1/public/domain-lookup/${disabledDomain}`)
      .expect(404);

    expect(queryResponse.body.error.code).toBe('RES_NOT_FOUND');
    expect(pathResponse.body.error.code).toBe('RES_NOT_FOUND');
  });
});
