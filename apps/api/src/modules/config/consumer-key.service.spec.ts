import { prisma } from '@tcrn/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getApiKeyStoredPrefix,
  hashApiKey,
} from '../integration/domain/api-key.policy';
import { ConsumerKeyService } from './consumer-key.service';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('ConsumerKeyService', () => {
  let service: ConsumerKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConsumerKeyService();
  });

  it('generates managed keys compatible with the integration API key guard', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'consumer-1', code: 'TCRN_FRONTEND' }]);
    mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(undefined);

    const result = await service.generateApiKey('consumer-1', 'tenant_test', 'user-1');

    expect(result.apiKey).toMatch(/^tcrn_[a-f0-9]+$/);
    expect(result.apiKeyPrefix).toBe(getApiKeyStoredPrefix(result.apiKey));
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "tenant_test".consumer'),
      'consumer-1',
      hashApiKey(result.apiKey),
      result.apiKeyPrefix,
      'user-1',
    );
  });

  it('does not verify legacy non-managed key material', async () => {
    const result = await service.verifyApiKey('legacy-browser-key', 'tenant_test');

    expect(result).toBeNull();
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('verifies managed key material with the canonical prefix and hash', async () => {
    const apiKey = 'tcrn_0123456789abcdef';
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 'consumer-1',
        code: 'TCRN_FRONTEND',
        apiKeyHash: hashApiKey(apiKey),
      },
    ]);

    const result = await service.verifyApiKey(apiKey, 'tenant_test');

    expect(result).toEqual({
      consumerId: 'consumer-1',
      consumerCode: 'TCRN_FRONTEND',
    });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('FROM "tenant_test".consumer'),
      getApiKeyStoredPrefix(apiKey),
    );
  });
});
