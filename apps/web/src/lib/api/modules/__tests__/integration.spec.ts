// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationApi } from '@/lib/api/modules/integration';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('integrationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists platforms and consumers from configuration entity endpoints', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });

    await integrationApi.listPlatforms();
    await integrationApi.listConsumers();

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/social-platform');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/configuration-entity/consumer');
  });

  it('posts platform and consumer payloads without legacy alias rewrites', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'entity-1' } });

    await integrationApi.createPlatform({
      code: 'TWITTER',
      nameEn: 'Twitter/X',
      displayName: 'Twitter/X',
      profileUrlTemplate: 'https://twitter.com/{username}',
      iconUrl: 'https://example.com/twitter.svg',
    });

    await integrationApi.createConsumer({
      code: 'EXTERNAL_API',
      nameEn: 'External API',
      consumerCategory: 'external',
      contactEmail: 'api@example.com',
      allowedIps: ['10.0.0.0/8'],
      rateLimit: 1000,
    });

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/social-platform', {
      code: 'TWITTER',
      nameEn: 'Twitter/X',
      displayName: 'Twitter/X',
      profileUrlTemplate: 'https://twitter.com/{username}',
      iconUrl: 'https://example.com/twitter.svg',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/configuration-entity/consumer', {
      code: 'EXTERNAL_API',
      nameEn: 'External API',
      consumerCategory: 'external',
      contactEmail: 'api@example.com',
      allowedIps: ['10.0.0.0/8'],
      rateLimit: 1000,
    });
  });

  it('routes consumer key mutations through configuration entity key endpoints', async () => {
    mockPost.mockResolvedValue({ success: true, data: { apiKeyPrefix: 'abcd1234' } });

    await integrationApi.generateConsumerKey('consumer-1');
    await integrationApi.rotateConsumerKey('consumer-1');
    await integrationApi.revokeConsumerKey('consumer-1');

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/configuration-entity/consumer/consumer-1/generate-key',
      {},
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/configuration-entity/consumer/consumer-1/rotate-key',
      {},
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/configuration-entity/consumer/consumer-1/revoke-key',
      {},
    );
  });

  it('routes adapter operations through tenant-root and explicit owner-root paths', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    mockPost.mockResolvedValue({ success: true, data: { id: 'adapter-1' } });
    mockPatch.mockResolvedValue({ success: true, data: { updatedCount: 1, adapterVersion: 3 } });

    await integrationApi.listAdapters(undefined, {
      includeInherited: true,
      includeDisabled: false,
    });
    await integrationApi.listAdapters(
      { ownerType: 'subsidiary', subsidiaryId: 'scope-1' },
      { includeInherited: false, includeDisabled: false },
    );
    await integrationApi.resolveEffectiveAdapter(
      { ownerType: 'talent', talentId: 'talent-1' },
      'TCRN_PII_PLATFORM',
    );
    await integrationApi.createAdapter(
      { ownerType: 'talent', talentId: 'talent-1' },
      {
        platformId: 'platform-1',
        code: 'YOUTUBE',
        nameEn: 'YouTube',
        adapterType: 'oauth',
        inherit: true,
      },
    );
    await integrationApi.disableAdapter({ ownerType: 'subsidiary', subsidiaryId: 'scope-1' }, 'adapter-1');
    await integrationApi.updateAdapterConfigs('adapter-1', {
      configs: [{ configKey: 'client_id', configValue: 'abc' }],
      adapterVersion: 2,
    });

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/integration/adapters', {
      includeInherited: true,
      includeDisabled: false,
    });
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/subsidiaries/scope-1/integration/adapters',
      {
        includeInherited: false,
        includeDisabled: false,
      },
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      '/api/v1/talents/talent-1/integration/adapters/effective/TCRN_PII_PLATFORM',
      undefined,
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/integration/adapters',
      {
        platformId: 'platform-1',
        code: 'YOUTUBE',
        nameEn: 'YouTube',
        adapterType: 'oauth',
        inherit: true,
      },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/subsidiaries/scope-1/integration/adapters/adapter-1/disable',
      {},
    );
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/integration/adapters/adapter-1/configs', {
      configs: [{ configKey: 'client_id', configValue: 'abc' }],
      adapterVersion: 2,
    });
  });

  it('creates and updates webhooks with the backend dto field names', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'webhook-1' } });
    mockPatch.mockResolvedValue({ success: true, data: { id: 'webhook-1' } });

    await integrationApi.createWebhook({
      code: 'CUSTOMER_CREATED',
      nameEn: 'Customer Created',
      url: 'https://example.com/hooks/customer-created',
      events: ['customer.created'],
      secret: 'secret-value',
    });

    await integrationApi.updateWebhook('webhook-1', {
      nameEn: 'Customer Created Updated',
      url: 'https://example.com/hooks/customer-created/v2',
      events: ['report.failed'],
      version: 3,
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/integration/webhooks', {
      code: 'CUSTOMER_CREATED',
      nameEn: 'Customer Created',
      url: 'https://example.com/hooks/customer-created',
      events: ['customer.created'],
      secret: 'secret-value',
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/integration/webhooks/webhook-1', {
      nameEn: 'Customer Created Updated',
      url: 'https://example.com/hooks/customer-created/v2',
      events: ['report.failed'],
      version: 3,
    });
  });
});
