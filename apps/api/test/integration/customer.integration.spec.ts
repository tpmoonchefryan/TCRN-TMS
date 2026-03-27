// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@tcrn/database';
import {
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Customer Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let localOnlyTalentId: string;
  let customerId: string | undefined;
  let localOnlyCustomerId: string | undefined;

  const withAuth = (req: request.Test, includeTalentHeader = false) => {
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

    if (includeTalentHeader) {
      req.set('X-Talent-Id', talentId);
    }

    return req;
  };

  const withTalentHeader = (req: request.Test, currentTalentId: string) =>
    withAuth(req).set('X-Talent-Id', currentTalentId);

  const createCustomer = (overrides: Record<string, unknown> = {}) =>
    withAuth(
      request(app.getHttpServer()).post('/api/v1/customers/individuals'),
    ).send({
      talentId,
      nickname: 'Integration Test User',
      tags: ['test', 'integration'],
      source: 'api',
      ...overrides,
    });

  const getCustomer = (id: string) =>
    withAuth(
      request(app.getHttpServer()).get(`/api/v1/customers/${id}`),
      true,
    );

  const getCustomerForTalent = (id: string, currentTalentId: string) =>
    withTalentHeader(
      request(app.getHttpServer()).get(`/api/v1/customers/${id}`),
      currentTalentId,
    );

  const ensureCustomer = async (): Promise<string> => {
    if (customerId) {
      return customerId;
    }

    const response = await createCustomer().expect(201);
    customerId = response.body.data.id;
    return customerId;
  };

  const ensureLocalOnlyCustomer = async (): Promise<string> => {
    if (localOnlyCustomerId) {
      return localOnlyCustomerId;
    }

    const response = await createCustomer({
      talentId: localOnlyTalentId,
      nickname: 'Local Only Customer',
    }).expect(201);
    localOnlyCustomerId = response.body.data.id;
    return localOnlyCustomerId;
  };

  const getCustomerVersion = async (): Promise<number> => {
    const id = await ensureCustomer();
    const response = await getCustomer(id).expect(200);
    return response.body.data.version;
  };

  const getCustomerVersionForTalent = async (
    id: string,
    currentTalentId: string,
  ): Promise<number> => {
    const response = await getCustomerForTalent(id, currentTalentId).expect(200);
    return response.body.data.version;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'customer');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `customer_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Customer Test Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TALENT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Customer Test Talent',
      displayName: 'Customer Test Talent',
      homepagePath: `customer-test-${Date.now()}`,
      createdBy: testUser.id,
    });

    talentId = talent.id;

    const localOnlyStoreRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".profile_store
      WHERE code = 'LOCAL_ONLY'
      LIMIT 1
    `);

    const localOnlyTalent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TALENT_LOCAL_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Customer Local Only Talent',
      displayName: 'Customer Local Only Talent',
      homepagePath: `customer-local-only-${Date.now()}`,
      profileStoreId: localOnlyStoreRows[0].id,
      createdBy: testUser.id,
    });

    localOnlyTalentId = localOnlyTalent.id;

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

  describe('GET /api/v1/customers', () => {
    it('should return empty list initially', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers'),
      )
        .query({ talentId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers')
        .query({ talentId })
        .expect(401);
    });

    it('should require talentId parameter', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers'),
      ).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/v1/customers/individuals', () => {
    it('should create a new customer', async () => {
      const response = await createCustomer().expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.nickname).toBe('Integration Test User');
      expect(response.body.data.profileType).toBe('individual');

      customerId = response.body.data.id;
    });

    it('should reject unexpected profileType field', async () => {
      const response = await createCustomer({
        profileType: 'invalid_type',
        nickname: 'Should Fail',
      }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should require nickname', async () => {
      const response = await createCustomer({
        nickname: undefined,
      }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject pii payload when profile store has no active pii backend', async () => {
      const response = await createCustomer({
        talentId: localOnlyTalentId,
        nickname: 'Local Only With PII',
        pii: {
          givenName: 'No',
          familyName: 'Backend',
        },
      }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('PII is not enabled for this profile store');
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer by id', async () => {
      const id = await ensureCustomer();
      const response = await getCustomer(id).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(id);
      expect(response.body.data.talentId).toBe(talentId);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers/00000000-0000-0000-0000-000000000000'),
        true,
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/customers/individuals/:id', () => {
    it('should update customer', async () => {
      const id = await ensureCustomer();
      const version = await getCustomerVersion();

      const response = await withAuth(
        request(app.getHttpServer()).patch(`/api/v1/customers/individuals/${id}`),
        true,
      )
        .send({
          nickname: 'Updated Nickname',
          tags: ['test', 'updated'],
          version,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe('Updated Nickname');
      expect(response.body.data.version).toBeGreaterThan(version);
    });

    it('should handle optimistic locking', async () => {
      const id = await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).patch(`/api/v1/customers/individuals/${id}`),
        true,
      )
        .send({
          nickname: 'Conflict Test',
          version: 0,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_VERSION_MISMATCH');
    });

    it('should reject pii updates when profile store has no active pii backend', async () => {
      const id = await ensureLocalOnlyCustomer();
      const version = await getCustomerVersionForTalent(id, localOnlyTalentId);

      const response = await withTalentHeader(
        request(app.getHttpServer()).patch(`/api/v1/customers/individuals/${id}/pii`),
        localOnlyTalentId,
      )
        .send({
          version,
          pii: {
            givenName: 'Denied',
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('PII is not enabled for this profile store');
    });
  });

  describe('POST /api/v1/customers/individuals/:id/request-pii-access', () => {
    it('should reject pii access requests when profile store has no active pii backend', async () => {
      const id = await ensureLocalOnlyCustomer();

      const response = await withTalentHeader(
        request(app.getHttpServer()).post(`/api/v1/customers/individuals/${id}/request-pii-access`),
        localOnlyTalentId,
      ).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('PII is not enabled for this profile store');
    });
  });

  describe('POST /api/v1/customers/:id/deactivate', () => {
    it('should deactivate customer', async () => {
      const id = await ensureCustomer();
      const version = await getCustomerVersion();

      const response = await withAuth(
        request(app.getHttpServer()).post(`/api/v1/customers/${id}/deactivate`),
        true,
      )
        .send({
          version,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/customers/:id/reactivate', () => {
    it('should reactivate customer', async () => {
      const id = await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).post(`/api/v1/customers/${id}/reactivate`),
        true,
      ).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    it('should search by nickname', async () => {
      await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers'),
      )
        .query({
          talentId,
          search: 'Updated',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.some((item: { nickname: string }) => item.nickname.includes('Updated')),
      ).toBe(true);
    });

    it('should filter by tags', async () => {
      await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers'),
      )
        .query(`talentId=${talentId}&tags=updated&tags=test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.every((item: { tags: string[] }) => item.tags.includes('updated')),
      ).toBe(true);
    });

    it('should paginate results', async () => {
      await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/customers'),
      )
        .query({
          talentId,
          page: 1,
          pageSize: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(10);
    });
  });
});
