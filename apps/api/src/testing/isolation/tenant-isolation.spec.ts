// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Multi-Tenant Isolation Tests

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestCustomerInTenant,
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../app.module';
import { TokenService } from '../../modules/auth/token.service';
import { bootstrapTestApp } from '../bootstrap-test-app';

describe('Multi-Tenant Isolation Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;
  let tokenService: TokenService;
  let jwtService: JwtService;

  let tenantA: TenantFixture;
  let tenantB: TenantFixture;

  let userA: TestUser;
  let userB: TestUser;

  let tokenA: string;
  let tokenB: string;
  let expiredTokenA: string;

  let customerA: { id: string; nickname: string };
  let customerB: { id: string; nickname: string };
  let subsidiaryA: { id: string; code: string };
  let subsidiaryB: { id: string; code: string };
  let talentA: { id: string; code: string; homepagePath: string };
  let talentB: { id: string; code: string; homepagePath: string };
  let talentAProfileStoreId: string;
  let talentBProfileStoreId: string;

  let reportJobBId: string;
  let marshmallowMessageBId: string;

  const withAuth = (req: request.Test, token: string, tenantId: string) =>
    req
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantId);

  const customerCollectionPath = (talentId: string) =>
    `/api/v1/talents/${talentId}/customers`;

  const customerDetailPath = (talentId: string, customerId: string) =>
    `${customerCollectionPath(talentId)}/${customerId}`;

  const individualCustomerPath = (talentId: string, customerId: string) =>
    `${customerCollectionPath(talentId)}/individuals/${customerId}`;

  const listCustomers = (token: string, tenantId: string, talentId: string) =>
    withAuth(
      request(app.getHttpServer()).get(customerCollectionPath(talentId)),
      token,
      tenantId,
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    await prisma.$connect();

    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    tokenService = moduleFixture.get(TokenService);
    jwtService = moduleFixture.get(JwtService);

    tenantA = await createTestTenantFixture(prisma, 'iso_a');
    tenantB = await createTestTenantFixture(prisma, 'iso_b');

    userA = await createTestUserInTenant(
      prisma,
      tenantA,
      `tenant_a_admin_${Date.now()}`,
      ['ADMIN'],
    );
    userB = await createTestUserInTenant(
      prisma,
      tenantB,
      `tenant_b_admin_${Date.now()}`,
      ['ADMIN'],
    );

    tokenA = tokenService.generateAccessToken({
      sub: userA.id,
      tid: userA.tenantId,
      tsc: userA.schemaName,
      email: userA.email,
      username: userA.username,
    }).token;

    tokenB = tokenService.generateAccessToken({
      sub: userB.id,
      tid: userB.tenantId,
      tsc: userB.schemaName,
      email: userB.email,
      username: userB.username,
    }).token;

    expiredTokenA = jwtService.sign(
      {
        sub: userA.id,
        tid: userA.tenantId,
        tsc: userA.schemaName,
        email: userA.email,
        username: userA.username,
        type: 'access',
        jti: crypto.randomUUID(),
      },
      { expiresIn: -1 },
    );

    subsidiaryA = await createTestSubsidiaryInTenant(prisma, tenantA, {
      code: `SUB_A_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Isolation Subsidiary A',
      createdBy: userA.id,
    });
    subsidiaryB = await createTestSubsidiaryInTenant(prisma, tenantB, {
      code: `SUB_B_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Isolation Subsidiary B',
      createdBy: userB.id,
    });

    talentA = await createTestTalentInTenant(prisma, tenantA, subsidiaryA.id, {
      code: `TAL_A_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Isolation Talent A',
      displayName: 'Isolation Talent A',
      homepagePath: `tenant-a-${Date.now()}`,
      createdBy: userA.id,
      lifecycleStatus: 'published',
    });
    talentB = await createTestTalentInTenant(prisma, tenantB, subsidiaryB.id, {
      code: `TAL_B_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Isolation Talent B',
      displayName: 'Isolation Talent B',
      homepagePath: `tenant-b-${Date.now()}`,
      createdBy: userB.id,
      lifecycleStatus: 'published',
    });

    const talentAProfileStore = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string }>>(
      `
        SELECT profile_store_id as "profileStoreId"
        FROM "${tenantA.schemaName}".talent
        WHERE id = $1::uuid
      `,
      talentA.id,
    );
    const talentBProfileStore = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string }>>(
      `
        SELECT profile_store_id as "profileStoreId"
        FROM "${tenantB.schemaName}".talent
        WHERE id = $1::uuid
      `,
      talentB.id,
    );

    talentAProfileStoreId = talentAProfileStore[0].profileStoreId;
    talentBProfileStoreId = talentBProfileStore[0].profileStoreId;

    customerA = await createTestCustomerInTenant(prisma, tenantA, {
      nickname: 'Isolation Customer A',
      talentId: talentA.id,
      profileStoreId: talentAProfileStoreId,
      createdBy: userA.id,
    });
    customerB = await createTestCustomerInTenant(prisma, tenantB, {
      nickname: 'Isolation Customer B',
      talentId: talentB.id,
      profileStoreId: talentBProfileStoreId,
      createdBy: userB.id,
    });

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantA.schemaName}".change_log (
          id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(), 'create', 'customer_profile', $1::uuid, $2, $3::jsonb, $4::uuid, '127.0.0.1', NOW()
        )
      `,
      customerA.id,
      customerA.nickname,
      JSON.stringify({ new: { nickname: customerA.nickname } }),
      userA.id,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantB.schemaName}".change_log (
          id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(), 'create', 'customer_profile', $1::uuid, $2, $3::jsonb, $4::uuid, '127.0.0.1', NOW()
        )
      `,
      customerB.id,
      customerB.nickname,
      JSON.stringify({ new: { nickname: customerB.nickname } }),
      userB.id,
    );

    reportJobBId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantB.schemaName}".report_job (
          id, talent_id, profile_store_id, report_type, filter_criteria, format,
          status, total_rows, queued_at, created_by, created_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, 'mfr', '{}'::jsonb, 'xlsx',
          'pending', 0, NOW(), $4::uuid, NOW()
        )
      `,
      reportJobBId,
      talentB.id,
      talentBProfileStoreId,
      userB.id,
    );

    const marshmallowConfigId = crypto.randomUUID();
    marshmallowMessageBId = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantB.schemaName}".marshmallow_config (
          id, talent_id, is_enabled, captcha_mode, moderation_enabled, auto_approve,
          profanity_filter_enabled, external_blocklist_enabled, min_message_length,
          max_message_length, created_at, updated_at, version
        ) VALUES (
          $1::uuid, $2::uuid, true, 'never', true, false,
          false, false, 5, 200, NOW(), NOW(), 1
        )
      `,
      marshmallowConfigId,
      talentB.id,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantB.schemaName}".marshmallow_message (
          id, config_id, talent_id, content, is_anonymous, status,
          ip_address, user_agent, fingerprint_hash, created_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4, true, 'pending',
          '203.0.113.50', 'tenant-isolation-vitest', $5, NOW()
        )
      `,
      marshmallowMessageBId,
      marshmallowConfigId,
      talentB.id,
      'Tenant B marshmallow message for isolation coverage.',
      'tenant-b-isolation-message',
    );
  });

  afterAll(async () => {
    await tenantA?.cleanup();
    await tenantB?.cleanup();
    await redis?.quit();
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('Customer isolation', () => {
    it('does not expose tenant B customer in tenant A list results', async () => {
      const response = await listCustomers(tokenA, tenantA.tenant.id, talentA.id).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.some((item: { id: string }) => item.id === customerA.id)).toBe(true);
      expect(response.body.data.some((item: { id: string }) => item.id === customerB.id)).toBe(false);
    });

    it('returns 404 when tenant A requests tenant B customer detail', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(customerDetailPath(talentA.id, customerB.id)),
        tokenA,
        tenantA.tenant.id,
      )
        .expect(404);

      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });

    it('returns 404 when tenant A tries to update tenant B customer', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).patch(individualCustomerPath(talentA.id, customerB.id)),
        tokenA,
        tenantA.tenant.id,
      )
        .send({
          nickname: 'cross-tenant-update',
          version: 1,
        })
        .expect(404);

      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });
  });

  describe('Organization isolation', () => {
    it('organization tree only contains tenant A nodes for tenant A token', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/organization/tree'),
        tokenA,
        tenantA.tenant.id,
      ).expect(200);

      const tree = JSON.stringify(response.body.data);

      expect(response.body.data.tenantId).toBe(tenantA.tenant.id);
      expect(tree).not.toContain(subsidiaryB.id);
      expect(tree).not.toContain(talentB.id);
    });
  });

  describe('Permission snapshot isolation', () => {
    it('stores Redis snapshot keys under each tenant schema independently', async () => {
      await listCustomers(tokenA, tenantA.tenant.id, talentA.id).expect(200);
      await listCustomers(tokenB, tenantB.tenant.id, talentB.id).expect(200);

      const keysA = await redis.keys(`perm:${tenantA.schemaName}:${userA.id}:*`);
      const keysB = await redis.keys(`perm:${tenantB.schemaName}:${userB.id}:*`);

      expect(keysA.length).toBeGreaterThan(0);
      expect(keysB.length).toBeGreaterThan(0);
      expect(keysA.every((key) => key.startsWith(`perm:${tenantA.schemaName}:${userA.id}:`))).toBe(true);
      expect(keysB.every((key) => key.startsWith(`perm:${tenantB.schemaName}:${userB.id}:`))).toBe(true);
      expect(keysA.some((key) => key.includes(tenantB.schemaName))).toBe(false);
      expect(keysB.some((key) => key.includes(tenantA.schemaName))).toBe(false);
    });
  });

  describe('PII isolation', () => {
    it('returns 404 when tenant A requests a PII portal session for tenant B customer', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post(
          `${individualCustomerPath(talentA.id, customerB.id)}/pii-portal-session`,
        ),
        tokenA,
        tenantA.tenant.id,
      )
        .expect(404);

      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });
  });

  describe('Report job isolation', () => {
    it('returns 400 when tenant A requests tenant B report job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/reports/mfr/jobs/${reportJobBId}`),
        tokenA,
        tenantA.tenant.id,
      )
        .query({ talent_id: talentA.id })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 when tenant A requests tenant B report download URL', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/reports/mfr/jobs/${reportJobBId}/download`),
        tokenA,
        tenantA.tenant.id,
      )
        .query({ talent_id: talentA.id })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 when tenant A tries to cancel tenant B report job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).delete(`/api/v1/reports/mfr/jobs/${reportJobBId}`),
        tokenA,
        tenantA.tenant.id,
      )
        .query({ talent_id: talentA.id })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('Change log isolation', () => {
    it('stores change logs in separate tenant schemas', async () => {
      const logsA = await prisma.$queryRawUnsafe<Array<{ objectId: string }>>(
        `
          SELECT object_id as "objectId"
          FROM "${tenantA.schemaName}".change_log
        `,
      );
      const logsB = await prisma.$queryRawUnsafe<Array<{ objectId: string }>>(
        `
          SELECT object_id as "objectId"
          FROM "${tenantB.schemaName}".change_log
        `,
      );

      expect(logsA.map((log) => log.objectId)).toContain(customerA.id);
      expect(logsA.map((log) => log.objectId)).not.toContain(customerB.id);
      expect(logsB.map((log) => log.objectId)).toContain(customerB.id);
      expect(logsB.map((log) => log.objectId)).not.toContain(customerA.id);
    });

    it('does not leak tenant B object history through the log API', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(
          `/api/v1/logs/changes/object/customer_profile/${customerB.id}`,
        ),
        tokenA,
        tenantA.tenant.id,
      ).expect(200);

      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('Marshmallow isolation', () => {
    it('returns 403 when tenant A tries to update tenant B marshmallow config', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).patch(`/api/v1/talents/${talentB.id}/marshmallow/config`),
        tokenA,
        tenantA.tenant.id,
      )
        .send({
          version: 1,
          isEnabled: false,
        })
        .expect(403);

      expect(response.body.error.code).toBe('TALENT_NOT_PUBLISHED');
    });

    it('returns 403 when tenant A tries to approve tenant B marshmallow message', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post(
          `/api/v1/talents/${talentB.id}/marshmallow/messages/${marshmallowMessageBId}/approve`,
        ),
        tokenA,
        tenantA.tenant.id,
      ).expect(403);

      expect(response.body.error.code).toBe('TALENT_NOT_PUBLISHED');
    });
  });

  describe('Token validation', () => {
    it('rejects expired access tokens', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(customerCollectionPath(talentA.id)),
        expiredTokenA,
        tenantA.tenant.id,
      )
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_TOKEN_EXPIRED');
    });
  });
});
