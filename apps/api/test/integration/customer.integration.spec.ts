// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Module Integration Tests

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

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

interface MockPiiProfile {
  id: string;
  profileStoreId: string;
  givenName?: string;
  familyName?: string;
  gender?: string;
  birthDate?: string;
  phoneNumbers?: Array<{
    typeCode: string;
    number: string;
    isPrimary?: boolean;
  }>;
  emails?: Array<{
    typeCode: string;
    address: string;
    isPrimary?: boolean;
  }>;
  addresses?: Array<{
    typeCode: string;
    countryCode: string;
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    postalCode?: string;
    isPrimary?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MockPiiRuntime {
  server: Server;
  baseUrl: string;
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function startMockPiiRuntime(): Promise<MockPiiRuntime> {
  const profiles = new Map<string, MockPiiProfile>();

  const server = createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const pathMatch = url.pathname.match(/^\/api\/v1\/profiles\/([^/]+)$/);
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'];

    if (!authHeader?.startsWith('Bearer ') || typeof tenantId !== 'string' || tenantId.length === 0) {
      sendJson(res, 401, {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing PII authorization headers',
        },
      });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/profiles') {
      const payload = await readJsonBody<Omit<MockPiiProfile, 'createdAt' | 'updatedAt'>>(req);
      const now = new Date().toISOString();
      profiles.set(payload.id, {
        ...payload,
        createdAt: now,
        updatedAt: now,
      });

      sendJson(res, 201, {
        success: true,
        data: {
          id: payload.id,
          createdAt: now,
        },
      });
      return;
    }

    if (method === 'GET' && pathMatch) {
      const profile = profiles.get(pathMatch[1]);

      if (!profile) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'PII_NOT_FOUND',
            message: 'PII profile not found',
          },
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: profile,
      });
      return;
    }

    if (method === 'PATCH' && pathMatch) {
      const existing = profiles.get(pathMatch[1]);

      if (!existing) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'PII_NOT_FOUND',
            message: 'PII profile not found',
          },
        });
        return;
      }

      const updates = await readJsonBody<Partial<MockPiiProfile>>(req);
      const updatedAt = new Date().toISOString();
      profiles.set(pathMatch[1], {
        ...existing,
        ...updates,
        id: existing.id,
        profileStoreId: existing.profileStoreId,
        updatedAt,
      });

      sendJson(res, 200, {
        success: true,
        data: {
          id: existing.id,
          updatedAt,
        },
      });
      return;
    }

    if (method === 'DELETE' && pathMatch) {
      profiles.delete(pathMatch[1]);
      sendJson(res, 200, {
        success: true,
        data: {
          id: pathMatch[1],
        },
      });
      return;
    }

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        success: true,
      });
      return;
    }

    sendJson(res, 404, {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Mock PII endpoint not found',
      },
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function configureTenantDefaultPiiRuntime(
  prisma: PrismaClient,
  schemaName: string,
  baseUrl: string,
): Promise<void> {
  const healthUrl = `${baseUrl}/health`;
  const piiConfigRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    INSERT INTO "${schemaName}".pii_service_config (
      id, code, name_en, api_url, auth_type, health_check_url,
      health_check_interval_sec, is_healthy, is_active, created_at, updated_at, version
    )
    VALUES (
      gen_random_uuid(), 'DEFAULT_PII', 'Default PII Service', $1, 'mtls', $2,
      60, true, true, NOW(), NOW(), 1
    )
    ON CONFLICT (code) DO UPDATE
    SET api_url = EXCLUDED.api_url,
        health_check_url = EXCLUDED.health_check_url,
        is_healthy = true,
        is_active = true,
        updated_at = NOW()
    RETURNING id
  `, baseUrl, healthUrl);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".profile_store (
      id, code, name_en, pii_proxy_url, pii_service_config_id,
      is_default, is_active, sort_order, created_at, updated_at, version
    )
    VALUES (
      gen_random_uuid(), 'DEFAULT_STORE', 'Default Profile Store', $1, $2::uuid,
      true, true, 0, NOW(), NOW(), 1
    )
    ON CONFLICT (code) DO UPDATE
    SET pii_proxy_url = EXCLUDED.pii_proxy_url,
        pii_service_config_id = EXCLUDED.pii_service_config_id,
        is_default = true,
        is_active = true,
        updated_at = NOW()
  `, baseUrl, piiConfigRows[0].id);
}

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
  let mockPiiRuntime: MockPiiRuntime;

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
    mockPiiRuntime = await startMockPiiRuntime();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'customer');
    await configureTenantDefaultPiiRuntime(
      prisma,
      tenantFixture.schemaName,
      mockPiiRuntime.baseUrl,
    );
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
    await new Promise<void>((resolve, reject) => {
      mockPiiRuntime?.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
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

    it('should create pii in the configured remote profile store', async () => {
      const response = await createCustomer({
        nickname: 'Remote PII Customer',
        pii: {
          givenName: 'Hanako',
          familyName: 'Yamada',
          phoneNumbers: [
            {
              typeCode: 'mobile',
              number: '+81-90-1234-5678',
              isPrimary: true,
            },
          ],
          emails: [
            {
              typeCode: 'personal',
              address: 'hanako@example.com',
              isPrimary: true,
            },
          ],
        },
      }).expect(201);

      const piiResponse = await request(mockPiiRuntime.server)
        .get(`/api/v1/profiles/${response.body.data.individual.rmProfileId}`)
        .set('Authorization', 'Bearer smoke-read-token')
        .set('X-Tenant-ID', tenantFixture.tenant.id)
        .expect(200);

      expect(piiResponse.body.data.givenName).toBe('Hanako');
      expect(piiResponse.body.data.familyName).toBe('Yamada');
      expect(piiResponse.body.data.phoneNumbers).toEqual([
        {
          typeCode: 'mobile',
          number: '+81-90-1234-5678',
          isPrimary: true,
        },
      ]);
      expect(piiResponse.body.data.emails).toEqual([
        {
          typeCode: 'personal',
          address: 'hanako@example.com',
          isPrimary: true,
        },
      ]);
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

    it('should update pii through the configured remote profile store', async () => {
      const createResponse = await createCustomer({
        nickname: 'Remote PII Update Customer',
        pii: {
          givenName: 'Before',
          familyName: 'Update',
          phoneNumbers: [
            {
              typeCode: 'mobile',
              number: '+81-90-0000-0000',
              isPrimary: true,
            },
          ],
        },
      }).expect(201);

      const id = createResponse.body.data.id as string;
      const version = await getCustomerVersionForTalent(id, talentId);

      await withTalentHeader(
        request(app.getHttpServer()).patch(`/api/v1/customers/individuals/${id}/pii`),
        talentId,
      )
        .send({
          version,
          pii: {
            givenName: 'After',
            familyName: 'Update',
            phoneNumbers: [
              {
                typeCode: 'mobile',
                number: '+81-90-9999-8888',
                isPrimary: true,
              },
            ],
            emails: [
              {
                typeCode: 'work',
                address: 'after.update@example.com',
                isPrimary: true,
              },
            ],
            addresses: [
              {
                typeCode: 'home',
                countryCode: 'JP',
                city: 'Tokyo',
                street: 'Shibuya 1-2-3',
                isPrimary: true,
              },
            ],
          },
        })
        .expect(200);

      const piiResponse = await request(mockPiiRuntime.server)
        .get(`/api/v1/profiles/${createResponse.body.data.individual.rmProfileId}`)
        .set('Authorization', 'Bearer smoke-read-token')
        .set('X-Tenant-ID', tenantFixture.tenant.id)
        .expect(200);

      expect(piiResponse.body.data.givenName).toBe('After');
      expect(piiResponse.body.data.familyName).toBe('Update');
      expect(piiResponse.body.data.phoneNumbers).toEqual([
        {
          typeCode: 'mobile',
          number: '+81-90-9999-8888',
          isPrimary: true,
        },
      ]);
      expect(piiResponse.body.data.emails).toEqual([
        {
          typeCode: 'work',
          address: 'after.update@example.com',
          isPrimary: true,
        },
      ]);
      expect(piiResponse.body.data.addresses).toEqual([
        {
          typeCode: 'home',
          countryCode: 'JP',
          city: 'Tokyo',
          street: 'Shibuya 1-2-3',
          isPrimary: true,
        },
      ]);
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

    it('should issue pii access credentials for remote profile store data', async () => {
      const createResponse = await createCustomer({
        nickname: 'Remote Access Customer',
        pii: {
          givenName: 'Access',
          familyName: 'Granted',
        },
      }).expect(201);

      const response = await withTalentHeader(
        request(app.getHttpServer()).post(
          `/api/v1/customers/individuals/${createResponse.body.data.id}/request-pii-access`,
        ),
        talentId,
      ).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.piiServiceUrl).toBe(mockPiiRuntime.baseUrl);
      expect(response.body.data.piiProfileId).toBe(
        createResponse.body.data.individual.rmProfileId,
      );
      expect(response.body.data.accessToken).toEqual(expect.any(String));

      const piiResponse = await request(mockPiiRuntime.server)
        .get(`/api/v1/profiles/${response.body.data.piiProfileId}`)
        .set('Authorization', `Bearer ${response.body.data.accessToken}`)
        .set('X-Tenant-ID', tenantFixture.tenant.id)
        .expect(200);

      expect(piiResponse.body.data.givenName).toBe('Access');
      expect(piiResponse.body.data.familyName).toBe('Granted');
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
