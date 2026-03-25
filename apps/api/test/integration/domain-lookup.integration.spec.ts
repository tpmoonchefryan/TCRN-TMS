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
  let customDomain: string;
  let homepagePath: string;
  let marshmallowPath: string;
  let createdBy: string;

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

    const talent = await createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_DOMAIN_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Domain Lookup Test Talent',
      displayName: 'Domain Lookup Test Talent',
      homepagePath: `domain-home-${Date.now()}`,
      createdBy,
    });

    customDomain = `lookup-${Date.now()}.example.com`;
    homepagePath = talent.homepagePath;
    marshmallowPath = `domain-ask-${Date.now()}`;

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantFixture.schemaName}".talent
      SET custom_domain = $2,
          custom_domain_verified = true,
          marshmallow_path = $3,
          updated_at = NOW()
      WHERE id = $1::uuid
    `, talent.id, customDomain, marshmallowPath);
  });

  afterAll(async () => {
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('returns homepage and marshmallow paths for the query-based public lookup endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/domain-lookup')
      .query({ domain: customDomain.toUpperCase() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      path: homepagePath,
      type: 'homepage',
      homepagePath,
      marshmallowPath,
    });
  });

  it('returns success-wrapped routing data for the path-based public lookup endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/domain-lookup/${customDomain.toUpperCase()}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      talentPath: homepagePath,
      homepagePath,
      marshmallowPath,
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
});
