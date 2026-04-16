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

interface MockCustomerPiiRecord {
  customerId: string;
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
  const customerPiiRecords = new Map<string, MockCustomerPiiRecord>();

  const server = createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const customerPiiPathMatch = url.pathname.match(/^\/api\/v1\/tms\/customers\/([^/]+)\/pii$/);
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

    if (method === 'PUT' && customerPiiPathMatch) {
      const customerId = customerPiiPathMatch[1];
      const payload = await readJsonBody<{
        customerId: string;
        pii: Omit<MockCustomerPiiRecord, 'customerId' | 'createdAt' | 'updatedAt'>;
      }>(req);
      const existing = customerPiiRecords.get(customerId);
      const now = new Date().toISOString();
      customerPiiRecords.set(customerId, {
        customerId,
        ...payload.pii,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      sendJson(res, 200, {
        success: true,
        data: {
          customerId,
          syncedAt: now,
        },
      });
      return;
    }

    if (method === 'GET' && customerPiiPathMatch) {
      const profile = customerPiiRecords.get(customerPiiPathMatch[1]);

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

    if (method === 'POST' && url.pathname === '/api/v1/tms/portal-sessions') {
      const payload = await readJsonBody<{ customerId: string }>(req);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const runtimeBaseUrl = `http://${req.headers.host ?? '127.0.0.1'}`;

      sendJson(res, 201, {
        success: true,
        data: {
          redirectUrl: `${runtimeBaseUrl}/portal/customers/${payload.customerId}?session=test-session`,
          expiresAt,
        },
      });
      return;
    }

    if (method === 'PUT' && url.pathname.match(/^\/api\/v1\/tms\/customers\/[^/]+\/lifecycle$/)) {
      const payload = await readJsonBody<{
        customerId: string;
        isActive: boolean;
        occurredAt: string;
      }>(req);
      const lifecycleStatus = payload.isActive ? 'active' : 'inactive';

      sendJson(res, 200, {
        success: true,
        data: {
          customerId: payload.customerId,
          lifecycleStatus,
          syncedAt: payload.occurredAt,
        },
      });
      return;
    }

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        success: true,
        status: 'ok',
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

async function configureTenantDefaultProfileStore(
  prisma: PrismaClient,
  schemaName: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".profile_store (
      id, code, name_en, is_default, is_active, sort_order, created_at, updated_at, version
    )
    VALUES (
      gen_random_uuid(), 'DEFAULT_STORE', 'Default Profile Store', true, true, 0, NOW(), NOW(), 1
    )
    ON CONFLICT (code) DO UPDATE
    SET is_default = true,
        is_active = true,
        updated_at = NOW()
  `);
}

async function configureTalentPiiPlatformAdapter(
  prisma: PrismaClient,
  schemaName: string,
  talentId: string,
  userId: string,
  baseUrl: string,
): Promise<void> {
  const platformRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO "${schemaName}".social_platform (
        id,
        code,
        display_name,
        name_en,
        name_zh,
        name_ja,
        base_url,
        profile_url_template,
        color,
        sort_order,
        is_active,
        created_at,
        updated_at,
        version
      ) VALUES (
        gen_random_uuid(),
        'TCRN_PII_PLATFORM',
        'TCRN PII Platform',
        'TCRN PII Platform',
        'TCRN PII Platform',
        'TCRN PII Platform',
        $1,
        NULL,
        '#2563eb',
        999,
        true,
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (code) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          name_en = EXCLUDED.name_en,
          name_zh = EXCLUDED.name_zh,
          name_ja = EXCLUDED.name_ja,
          base_url = EXCLUDED.base_url,
          is_active = true,
          updated_at = NOW()
      RETURNING id
    `,
    baseUrl,
  );

  const adapterRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO "${schemaName}".integration_adapter (
        id,
        owner_type,
        owner_id,
        platform_id,
        code,
        name_en,
        name_zh,
        name_ja,
        adapter_type,
        inherit,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        gen_random_uuid(),
        'talent',
        $1::uuid,
        $2::uuid,
        'TCRN_PII_PLATFORM',
        'TCRN PII Platform',
        'TCRN PII Platform',
        'TCRN PII Platform',
        'api_key',
        false,
        true,
        NOW(),
        NOW(),
        $3::uuid,
        $3::uuid
      )
      ON CONFLICT (owner_type, owner_id, code) DO UPDATE
      SET platform_id = EXCLUDED.platform_id,
          name_en = EXCLUDED.name_en,
          name_zh = EXCLUDED.name_zh,
          name_ja = EXCLUDED.name_ja,
          adapter_type = EXCLUDED.adapter_type,
          inherit = EXCLUDED.inherit,
          is_active = true,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      RETURNING id
    `,
    talentId,
    platformRows[0].id,
    userId,
  );

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "${schemaName}".adapter_config (
        id,
        adapter_id,
        config_key,
        config_value,
        is_secret,
        created_at,
        updated_at
      ) VALUES
        (gen_random_uuid(), $1::uuid, 'api_base_url', $2, false, NOW(), NOW()),
        (gen_random_uuid(), $1::uuid, 'service_token', 'test-service-token', true, NOW(), NOW())
      ON CONFLICT (adapter_id, config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        is_secret = EXCLUDED.is_secret,
        updated_at = NOW()
    `,
    adapterRows[0].id,
    baseUrl,
  );
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

  const withAuth = (req: request.Test) => {
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

    return req;
  };

  const customerCollectionPath = (currentTalentId: string = talentId) =>
    `/api/v1/talents/${currentTalentId}/customers`;

  const customerDetailPath = (
    id: string,
    currentTalentId: string = talentId,
  ) => `${customerCollectionPath(currentTalentId)}/${id}`;

  const individualCustomerPath = (
    id: string,
    currentTalentId: string = talentId,
  ) => `${customerCollectionPath(currentTalentId)}/individuals/${id}`;

  const createCustomer = (
    overrides: Record<string, unknown> = {},
    currentTalentId: string = talentId,
  ) => {
    const payload = { ...overrides };
    delete payload.talentId;

    return withAuth(
      request(app.getHttpServer()).post(`${customerCollectionPath(currentTalentId)}/individuals`),
    ).send({
      nickname: 'Integration Test User',
      tags: ['test', 'integration'],
      source: 'api',
      ...payload,
    });
  };

  const getCustomer = (id: string, currentTalentId: string = talentId) =>
    withAuth(
      request(app.getHttpServer()).get(customerDetailPath(id, currentTalentId)),
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
      nickname: 'Local Only Customer',
    }, localOnlyTalentId).expect(201);
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
    const response = await getCustomer(id, currentTalentId).expect(200);
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
    await configureTenantDefaultProfileStore(prisma, tenantFixture.schemaName);
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
      lifecycleStatus: 'published',
    });

    talentId = talent.id;
    await configureTalentPiiPlatformAdapter(
      prisma,
      tenantFixture.schemaName,
      talentId,
      testUser.id,
      mockPiiRuntime.baseUrl,
    );

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
      lifecycleStatus: 'published',
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

  describe('GET /api/v1/talents/:talentId/customers', () => {
    it('should return empty list initially', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(customerCollectionPath()),
      )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(customerCollectionPath())
        .expect(401);
    });

    it('should not expose the legacy tenant-root customer list route', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers')
        .expect(404);
    });
  });

  describe('POST /api/v1/talents/:talentId/customers/individuals', () => {
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

    it('should reject pii payload when the talent has no active pii platform adapter', async () => {
      const response = await createCustomer({
        nickname: 'Local Only With PII',
        pii: {
          givenName: 'No',
          familyName: 'Backend',
        },
      }, localOnlyTalentId).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('TCRN PII Platform is not enabled for this talent');
    });

    it('should synchronize pii to the configured external platform', async () => {
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

      expect(response.body.data.individual).toBeUndefined();

      const piiResponse = await request(mockPiiRuntime.server)
        .get(`/api/v1/tms/customers/${response.body.data.id}/pii`)
        .set('Authorization', 'Bearer test-service-token')
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

  describe('GET /api/v1/talents/:talentId/customers/:customerId', () => {
    it('should return customer by id', async () => {
      const id = await ensureCustomer();
      const response = await getCustomer(id).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(id);
      expect(response.body.data.talentId).toBe(talentId);
      expect(response.body.data.individual.piiReadbackEnabled).toBe(false);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get(
          customerDetailPath('00000000-0000-0000-0000-000000000000'),
        ),
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/talents/:talentId/customers/individuals/:customerId', () => {
    it('should update customer', async () => {
      const id = await ensureCustomer();
      const version = await getCustomerVersion();

      const response = await withAuth(
        request(app.getHttpServer()).patch(individualCustomerPath(id)),
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
        request(app.getHttpServer()).patch(individualCustomerPath(id)),
      )
        .send({
          nickname: 'Conflict Test',
          version: 0,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_VERSION_MISMATCH');
    });

    it('should reject pii updates when the talent has no active pii platform adapter', async () => {
      const id = await ensureLocalOnlyCustomer();
      const version = await getCustomerVersionForTalent(id, localOnlyTalentId);

      const response = await withAuth(
        request(app.getHttpServer()).patch(`${individualCustomerPath(id, localOnlyTalentId)}/pii`),
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
      expect(response.body.error.message).toBe('TCRN PII Platform is not enabled for this talent');
    });

    it('should update pii through the configured external platform', async () => {
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

      await withAuth(
        request(app.getHttpServer()).patch(`${individualCustomerPath(id)}/pii`),
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
        .get(`/api/v1/tms/customers/${id}/pii`)
        .set('Authorization', 'Bearer test-service-token')
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

  describe('POST /api/v1/talents/:talentId/customers/individuals/:customerId/pii-portal-session', () => {
    it('should reject pii portal session requests when the talent has no active pii platform adapter', async () => {
      const id = await ensureLocalOnlyCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).post(
          `${individualCustomerPath(id, localOnlyTalentId)}/pii-portal-session`,
        ),
      ).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('TCRN PII Platform is not enabled for this talent');
    });

    it('should create a portal session for external pii retrieval', async () => {
      const createResponse = await createCustomer({
        nickname: 'Remote Access Customer',
        pii: {
          givenName: 'Access',
          familyName: 'Granted',
        },
      }).expect(201);

      const response = await withAuth(
        request(app.getHttpServer()).post(
          `${individualCustomerPath(createResponse.body.data.id)}/pii-portal-session`,
        ),
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.redirectUrl).toContain(mockPiiRuntime.baseUrl);
      expect(response.body.data.redirectUrl).toContain(createResponse.body.data.id);
      expect(response.body.data.expiresAt).toEqual(expect.any(String));
    });
  });

  describe('POST /api/v1/talents/:talentId/customers/:customerId/deactivate', () => {
    it('should deactivate customer', async () => {
      const id = await ensureCustomer();
      const version = await getCustomerVersion();

      const response = await withAuth(
        request(app.getHttpServer()).post(`${customerDetailPath(id)}/deactivate`),
      )
        .send({
          version,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/talents/:talentId/customers/:customerId/reactivate', () => {
    it('should reactivate customer', async () => {
      const id = await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).post(`${customerDetailPath(id)}/reactivate`),
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    it('should search by nickname', async () => {
      await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).get(customerCollectionPath()),
      )
        .query({
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
        request(app.getHttpServer()).get(customerCollectionPath()),
      )
        .query('tags=updated&tags=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.every((item: { tags: string[] }) => item.tags.includes('updated')),
      ).toBe(true);
    });

    it('should paginate results', async () => {
      await ensureCustomer();

      const response = await withAuth(
        request(app.getHttpServer()).get(customerCollectionPath()),
      )
        .query({
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
