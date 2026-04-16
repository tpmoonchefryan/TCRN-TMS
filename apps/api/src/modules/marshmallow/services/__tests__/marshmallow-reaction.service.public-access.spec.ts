import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { MarshmallowReactionRepository } from '../../infrastructure/marshmallow-reaction.repository';

describe('MarshmallowReactionRepository public access', () => {
  let repository: MarshmallowReactionRepository;
  let mockDatabaseService: Pick<DatabaseService, 'getPrisma'>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRawUnsafe: vi.fn(),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    repository = new MarshmallowReactionRepository(mockDatabaseService as DatabaseService);
  });

  it('queries only enabled configs and published talents for public reactions', async () => {
    const messageId = '550e8400-e29b-41d4-a716-446655440020';
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await expect(
      repository.findPublishedMessageAccessInTenant('tenant_demo', messageId),
    ).resolves.toBeNull();

    const [sql, param] = mockPrisma.$queryRawUnsafe.mock.calls[0] ?? [];

    expect(sql).toContain('AND c.is_enabled = true');
    expect(sql).toContain(`AND t.lifecycle_status = 'published'`);
    expect(param).toBe(messageId);
  });
});
