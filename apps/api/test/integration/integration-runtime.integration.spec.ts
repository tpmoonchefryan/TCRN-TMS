// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
import { ApiKeyService } from '../../src/modules/integration/services/api-key.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Integration Runtime Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let subsidiaryId: string;
  let talentId: string;
  let platformId: string;
  let consumerId: string;
  let consumerCode: string;
  let apiKeyService: ApiKeyService;

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
    tenantFixture = await createTestTenantFixture(prisma, 'integration');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `integration_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_INT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Integration Runtime Subsidiary',
      createdBy: testUser.id,
    });
    subsidiaryId = subsidiary.id;

    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_INT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Integration Runtime Talent',
      displayName: 'Integration Runtime Talent',
      homepagePath: `integration-runtime-${Date.now()}`,
      createdBy: testUser.id,
    });
    talentId = talent.id;
    const tokenService = moduleFixture.get(TokenService);
    apiKeyService = moduleFixture.get(ApiKeyService);
    accessToken = tokenService.generateAccessToken({
      sub: testUser.id,
      tid: testUser.tenantId,
      tsc: testUser.schemaName,
      email: testUser.email,
      username: testUser.username,
    }).token;

    const createPlatformResponse = await withAuth(
      request(app.getHttpServer()).post('/api/v1/configuration-entity/social-platform'),
    )
      .send({
        code: `INTEGRATION_${Date.now().toString(36).toUpperCase()}`,
        nameEn: 'Integration Runtime Platform',
        displayName: 'Integration Runtime Platform',
        isActive: true,
      })
      .expect(201);

    platformId = createPlatformResponse.body.data.id as string;

    consumerCode = `INTEGRATION_CONSUMER_${Date.now().toString(36).toUpperCase()}`;
    const createConsumerResponse = await withAuth(
      request(app.getHttpServer()).post('/api/v1/configuration-entity/consumer'),
    )
      .send({
        code: consumerCode,
        nameEn: 'Integration Runtime Consumer',
        consumerCategory: 'partner',
        isActive: true,
      })
      .expect(201);

    consumerId = createConsumerResponse.body.data.id as string;
  });

  afterAll(async () => {
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('creates adapters through tenant-root and explicit owner-root routes without body owner carriers', async () => {
    const tenantResponse = await withAuth(
      request(app.getHttpServer()).post('/api/v1/integration/adapters'),
    )
      .send({
        platformId,
        code: 'TENANT_ADAPTER',
        nameEn: 'Tenant Adapter',
        adapterType: 'oauth',
      });

    expect(tenantResponse.status).toBe(201);

    const subsidiaryResponse = await withAuth(
      request(app.getHttpServer()).post(
        `/api/v1/subsidiaries/${subsidiaryId}/integration/adapters`,
      ),
    )
      .send({
        platformId,
        code: 'SUBSIDIARY_ADAPTER',
        nameEn: 'Subsidiary Adapter',
        adapterType: 'api_key',
      })
      .expect(201);

    const talentResponse = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/talents/${talentId}/integration/adapters`),
    )
      .send({
        platformId,
        code: 'TALENT_ADAPTER',
        nameEn: 'Talent Adapter',
        adapterType: 'webhook',
      })
      .expect(201);

    expect(tenantResponse.body.data).toMatchObject({
      ownerType: 'tenant',
      ownerId: null,
      code: 'TENANT_ADAPTER',
    });
    expect(subsidiaryResponse.body.data).toMatchObject({
      ownerType: 'subsidiary',
      ownerId: subsidiaryId,
      code: 'SUBSIDIARY_ADAPTER',
    });
    expect(talentResponse.body.data).toMatchObject({
      ownerType: 'talent',
      ownerId: talentId,
      code: 'TALENT_ADAPTER',
    });
  });

  it('lists only the canonical owner view for each route family', async () => {
    const tenantListResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/integration/adapters'),
    ).expect(200);

    const subsidiaryInheritedResponse = await withAuth(
      request(app.getHttpServer()).get(
        `/api/v1/subsidiaries/${subsidiaryId}/integration/adapters`,
      ),
    )
      .query({ includeInherited: true })
      .expect(200);

    const subsidiaryExactResponse = await withAuth(
      request(app.getHttpServer()).get(
        `/api/v1/subsidiaries/${subsidiaryId}/integration/adapters`,
      ),
    )
      .query({ includeInherited: false })
      .expect(200);

    const talentInheritedResponse = await withAuth(
      request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/integration/adapters`),
    )
      .query({ includeInherited: true })
      .expect(200);

    const tenantCodes = tenantListResponse.body.data.map((item: { code: string }) => item.code);
    const subsidiaryInheritedCodes = subsidiaryInheritedResponse.body.data.map(
      (item: { code: string }) => item.code,
    );
    const subsidiaryExactCodes = subsidiaryExactResponse.body.data.map(
      (item: { code: string }) => item.code,
    );
    const talentInheritedCodes = talentInheritedResponse.body.data.map(
      (item: { code: string }) => item.code,
    );

    expect(tenantCodes).toContain('TENANT_ADAPTER');
    expect(tenantCodes).not.toContain('SUBSIDIARY_ADAPTER');
    expect(tenantCodes).not.toContain('TALENT_ADAPTER');

    expect(subsidiaryInheritedCodes).toContain('TENANT_ADAPTER');
    expect(subsidiaryInheritedCodes).toContain('SUBSIDIARY_ADAPTER');
    expect(subsidiaryInheritedCodes).not.toContain('TALENT_ADAPTER');

    expect(subsidiaryExactCodes).toContain('SUBSIDIARY_ADAPTER');
    expect(subsidiaryExactCodes).not.toContain('TENANT_ADAPTER');

    expect(talentInheritedCodes).toContain('TENANT_ADAPTER');
    expect(talentInheritedCodes).toContain('TALENT_ADAPTER');
    expect(talentInheritedCodes).not.toContain('SUBSIDIARY_ADAPTER');
  });

  it('creates and mutates webhooks through tenant-scoped integration routes', async () => {
    const createWebhookResponse = await withAuth(
      request(app.getHttpServer()).post('/api/v1/integration/webhooks'),
    )
      .send({
        code: 'TENANT_WEBHOOK',
        nameEn: 'Tenant Webhook',
        url: 'https://example.com/integration/webhook',
        events: ['customer.created'],
        secret: 'super-secret',
        headers: {
          'x-test-webhook': 'enabled',
        },
        retryPolicy: {
          maxRetries: 5,
          backoffMs: 2500,
        },
      })
      .expect(201);

    const webhookId = createWebhookResponse.body.data.id as string;

    const listWebhookResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/integration/webhooks'),
    ).expect(200);

    const detailWebhookResponse = await withAuth(
      request(app.getHttpServer()).get(`/api/v1/integration/webhooks/${webhookId}`),
    ).expect(200);

    const updateWebhookResponse = await withAuth(
      request(app.getHttpServer()).patch(`/api/v1/integration/webhooks/${webhookId}`),
    )
      .send({
        nameEn: 'Tenant Webhook Updated',
        url: 'https://example.com/integration/webhook-updated',
        headers: {
          'x-test-webhook': 'updated',
        },
        retryPolicy: {
          backoffMs: 3000,
        },
        version: detailWebhookResponse.body.data.version,
      })
      .expect(200);

    const deactivateWebhookResponse = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/integration/webhooks/${webhookId}/deactivate`),
    ).expect(201);

    const reactivateWebhookResponse = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/integration/webhooks/${webhookId}/reactivate`),
    ).expect(201);

    const deleteWebhookResponse = await withAuth(
      request(app.getHttpServer()).delete(`/api/v1/integration/webhooks/${webhookId}`),
    ).expect(200);

    expect(
      listWebhookResponse.body.data.some(
        (item: { id: string; code: string }) =>
          item.id === webhookId && item.code === 'TENANT_WEBHOOK',
      ),
    ).toBe(true);
    expect(detailWebhookResponse.body.data).toMatchObject({
      id: webhookId,
      code: 'TENANT_WEBHOOK',
      secret: '******',
      headers: {
        'x-test-webhook': 'enabled',
      },
      retryPolicy: {
        maxRetries: 5,
        backoffMs: 2500,
      },
    });
    expect(updateWebhookResponse.body.data).toMatchObject({
      id: webhookId,
      nameEn: 'Tenant Webhook Updated',
      url: 'https://example.com/integration/webhook-updated',
      headers: {
        'x-test-webhook': 'updated',
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 3000,
      },
    });
    expect(deactivateWebhookResponse.body.data).toEqual({
      id: webhookId,
      isActive: false,
    });
    expect(reactivateWebhookResponse.body.data).toEqual({
      id: webhookId,
      isActive: true,
    });
    expect(deleteWebhookResponse.body.data).toEqual({
      id: webhookId,
      deleted: true,
    });

    await withAuth(
      request(app.getHttpServer()).get(`/api/v1/integration/webhooks/${webhookId}`),
    ).expect(404);
  });

  it('regenerates consumer API keys in the tenant schema and validates them through integration service lookup', async () => {
    const regenerateResponse = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/integration/consumers/${consumerId}/regenerate-key`),
    ).expect(201);

    const generatedApiKey = regenerateResponse.body.data.apiKey as string;
    const generatedPrefix = regenerateResponse.body.data.apiKeyPrefix as string;

    expect(generatedApiKey.startsWith('tcrn_')).toBe(true);
    expect(generatedPrefix).toBeTruthy();

    const storedConsumers = await prisma.$queryRawUnsafe<Array<{ apiKeyPrefix: string | null }>>(
      `
        SELECT api_key_prefix as "apiKeyPrefix"
        FROM "${tenantFixture.schemaName}".consumer
        WHERE id = $1::uuid
      `,
      consumerId,
    );

    expect(storedConsumers[0]?.apiKeyPrefix).toBe(generatedPrefix);

    const validatedConsumer = await apiKeyService.validateApiKey(generatedApiKey);

    expect(validatedConsumer).toMatchObject({
      id: consumerId,
      code: consumerCode,
      tenantSchema: tenantFixture.schemaName,
    });
  });
});
