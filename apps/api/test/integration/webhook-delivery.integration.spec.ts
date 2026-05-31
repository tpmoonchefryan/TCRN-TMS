// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { INestApplication, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { IntegrationController } from '../../src/modules/integration/controllers/integration.controller';
import { OwnerType } from '../../src/modules/integration/dto/integration.dto';
import { AdapterResolutionService } from '../../src/modules/integration/services/adapter-resolution.service';
import { AdapterService } from '../../src/modules/integration/services/adapter.service';
import { ApiKeyService } from '../../src/modules/integration/services/api-key.service';
import { WebhookService } from '../../src/modules/integration/services/webhook.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

const webhookId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const tenantId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

const requestUser = {
  id: userId,
  username: 'webhook_delivery_operator',
  tenantId,
  tenantSchema: 'tenant_webhook_delivery_contract',
  email: 'webhook-delivery@example.test',
};

const attempt = {
  id: attemptId,
  outboxId: '55555555-5555-4555-8555-555555555555',
  webhookId,
  eventCode: 'customer.created',
  payloadVersion: 'v1',
  idempotencyKey: 'TEST_P7_WEBHOOK_IDEMPOTENCY',
  payloadHash: 'abcdef1234567890',
  attemptNumber: 1,
  status: 'dry_run',
  dispatchMode: 'disabled',
  endpointUrl: 'https://example.com/webhook',
  requestHeaders: {
    'x-tcrn-signature': '******',
  },
  requestBodySummary: {
    redacted: true,
  },
  responseStatus: null,
  responseBodySummary: {},
  errorCode: 'DRY_RUN_NO_OUTBOUND_HTTP',
  errorMessage: 'Dry run recorded without outbound HTTP dispatch',
  latencyMs: null,
  nextRetryAt: null,
  deliveredAt: null,
  replayReason: 'Phase 7 route contract test',
  traceId: 'trace-webhook-delivery-contract',
  createdAt: '2026-05-31T00:00:00.000Z',
  updatedAt: '2026-05-31T00:00:00.000Z',
};

const operationResult = {
  accepted: true,
  duplicate: false,
  dryRun: true,
  dispatchMode: 'disabled',
  status: 'dry_run',
  webhookId,
  outboxId: attempt.outboxId,
  attemptId,
  eventCode: 'customer.created',
  payloadVersion: 'v1',
  idempotencyKey: attempt.idempotencyKey,
  traceId: attempt.traceId,
  redacted: true,
};

function responseData(response: request.Response) {
  return response.body.data ?? response.body;
}

const webhookService = {
  getEvents: vi.fn().mockReturnValue([
    {
      eventCode: 'customer.created',
      payloadVersion: 'v1',
      category: 'customer',
      producer: 'customer',
      piiClass: 'reference',
      subscriptionEligible: true,
    },
  ]),
  listDeliveryAttempts: vi.fn().mockResolvedValue({
    items: [attempt],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
  getDeliveryAttempt: vi.fn().mockResolvedValue(attempt),
  createTestDelivery: vi.fn().mockResolvedValue(operationResult),
  replayDeliveryAttempt: vi.fn().mockResolvedValue(operationResult),
};

@Module({
  controllers: [IntegrationController],
  providers: [
    { provide: AdapterService, useValue: {} },
    { provide: AdapterResolutionService, useValue: {} },
    { provide: WebhookService, useValue: webhookService },
    { provide: ApiKeyService, useValue: {} },
  ],
})
class WebhookDeliveryRouteContractModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, _res: unknown, next: () => void) => {
        (req as unknown as { user: typeof requestUser }).user = requestUser;
        next();
      })
      .forRoutes('*');
  }
}

describe('Webhook delivery route contract integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhookDeliveryRouteContractModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exposes event catalog and redacted delivery attempt read routes', async () => {
    const eventCatalogResponse = await request(app.getHttpServer())
      .get('/api/v1/integration/webhooks/events')
      .expect(200);
    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/integration/webhooks/${webhookId}/delivery-attempts`)
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/integration/webhooks/${webhookId}/delivery-attempts/${attemptId}`)
      .expect(200);

    expect(responseData(eventCatalogResponse)[0]).toMatchObject({
      eventCode: 'customer.created',
      payloadVersion: 'v1',
      subscriptionEligible: true,
    });
    expect(responseData(listResponse).items[0].requestHeaders['x-tcrn-signature']).toBe('******');
    expect(responseData(detailResponse)).toMatchObject({
      id: attemptId,
      status: 'dry_run',
      requestBodySummary: { redacted: true },
    });
    expect(webhookService.listDeliveryAttempts).toHaveBeenCalledWith(
      webhookId,
      expect.any(Object),
      expect.objectContaining({
        tenantId,
        tenantSchema: requestUser.tenantSchema,
      })
    );
  });

  it('accepts test and replay operations through 202 dry-run routes with reason DTOs', async () => {
    const testResponse = await request(app.getHttpServer())
      .post(`/api/v1/integration/webhooks/${webhookId}/test-delivery`)
      .send({
        reason: 'Phase 7 route contract test',
        dryRun: true,
      })
      .expect(202);
    const replayResponse = await request(app.getHttpServer())
      .post(`/api/v1/integration/webhooks/${webhookId}/delivery-attempts/${attemptId}/replay`)
      .send({
        reason: 'Phase 7 replay route contract test',
        dryRun: true,
        idempotencyKey: 'TEST_P7_WEBHOOK_REPLAY_IDEMPOTENCY',
      })
      .expect(202);

    expect(responseData(testResponse)).toMatchObject({
      accepted: true,
      dryRun: true,
      redacted: true,
    });
    expect(responseData(replayResponse)).toMatchObject({
      accepted: true,
      dryRun: true,
      redacted: true,
    });
    expect(webhookService.createTestDelivery).toHaveBeenCalledWith(
      webhookId,
      expect.objectContaining({
        reason: 'Phase 7 route contract test',
        dryRun: true,
      }),
      expect.objectContaining({
        tenantSchema: requestUser.tenantSchema,
      })
    );
    expect(webhookService.replayDeliveryAttempt).toHaveBeenCalledWith(
      webhookId,
      attemptId,
      expect.objectContaining({
        reason: 'Phase 7 replay route contract test',
        dryRun: true,
      }),
      expect.objectContaining({
        tenantSchema: requestUser.tenantSchema,
      })
    );
  });

  it('keeps ordinary adapter owner routes out of webhook delivery route proof', async () => {
    expect(OwnerType.TENANT).toBe('tenant');
    expect(webhookService.createTestDelivery).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ providerToken: expect.any(String) }),
      expect.any(Object)
    );
  });
});
