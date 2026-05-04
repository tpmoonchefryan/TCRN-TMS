import { prisma } from '@tcrn/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DictionaryService } from './dictionary.service';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('DictionaryService search contract', () => {
  const service = new DictionaryService();

  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('searches dynamic dictionary item translation maps', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ count: 0n }])
      .mockResolvedValueOnce([]);

    await service.getByType('CUSTOMER_STATUS', {
      includeInactive: true,
      search: 'Actif',
    });

    const countSql = String(mockPrisma.$queryRawUnsafe.mock.calls[1][0]);

    expect(countSql).toContain('name_ja ILIKE');
    expect(countSql).toContain("jsonb_each_text(COALESCE(extra_data -> 'translations', '{}'::jsonb))");
    expect(mockPrisma.$queryRawUnsafe.mock.calls[1][1]).toBe('CUSTOMER_STATUS');
    expect(mockPrisma.$queryRawUnsafe.mock.calls[1][2]).toBe('%Actif%');
  });
});
