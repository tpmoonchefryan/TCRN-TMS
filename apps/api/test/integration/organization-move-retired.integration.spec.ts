// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestSubsidiaryInTenant,
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

describe('Organization Move Retired Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let sourceSubsidiaryId: string;
  let targetSubsidiaryId: string;

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'orgmove');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `orgmove_admin_${Date.now()}`,
      ['ADMIN'],
    );

    const sourceSubsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_MOVE_SRC_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Organization Move Source Subsidiary',
      createdBy: testUser.id,
    });
    const targetSubsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_MOVE_DST_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Organization Move Target Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, sourceSubsidiary.id, {
      code: `TAL_MOVE_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Organization Move Talent',
      displayName: 'Organization Move Talent',
      homepagePath: `organization-move-${Date.now()}`,
      createdBy: testUser.id,
    });

    sourceSubsidiaryId = sourceSubsidiary.id;
    targetSubsidiaryId = targetSubsidiary.id;
    talentId = talent.id;

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
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('returns 409 for the retired talent move route', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/talents/${talentId}/move`),
    )
      .send({
        newSubsidiaryId: targetSubsidiaryId,
        version: 1,
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatchObject({
      code: 'RES_CONFLICT',
    });
    expect(response.body.error.message).toContain('retired from normal product flow');
    expect(response.body.error.message).toContain('direct database intervention');
  });

  it('returns 409 for the retired subsidiary move route', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/subsidiaries/${sourceSubsidiaryId}/move`),
    )
      .send({
        newParentId: targetSubsidiaryId,
        version: 1,
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatchObject({
      code: 'RES_CONFLICT',
    });
    expect(response.body.error.message).toContain('retired from normal product flow');
    expect(response.body.error.message).toContain('direct database intervention');
  });
});
