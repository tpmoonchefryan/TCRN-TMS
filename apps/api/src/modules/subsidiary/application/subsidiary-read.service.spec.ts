// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubsidiaryReadRepository } from '../infrastructure/subsidiary-read.repository';
import { SubsidiaryReadApplicationService } from './subsidiary-read.service';

describe('SubsidiaryReadApplicationService', () => {
  let service: SubsidiaryReadApplicationService;

  const mockSubsidiaryReadRepository = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    getChildrenCount: vi.fn(),
    getTalentCount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new SubsidiaryReadApplicationService(
      mockSubsidiaryReadRepository as unknown as SubsidiaryReadRepository,
    );
  });

  it('builds list query defaults and returns paginated data', async () => {
    mockSubsidiaryReadRepository.list.mockResolvedValue([
      { id: 'subsidiary-1', code: 'TOKYO' },
    ]);
    mockSubsidiaryReadRepository.count.mockResolvedValue(1);

    await expect(
      service.list('tenant_test', { search: 'Tokyo', isActive: true }),
    ).resolves.toEqual({
      data: [{ id: 'subsidiary-1', code: 'TOKYO' }],
      total: 1,
    });

    expect(mockSubsidiaryReadRepository.list).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        whereClause: expect.stringContaining('code ILIKE'),
        orderBy: 'sort_order ASC, created_at DESC',
        pageSize: 20,
        offset: 0,
      }),
    );
    expect(mockSubsidiaryReadRepository.count).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        params: ['%Tokyo%', true],
      }),
    );
  });

  it('delegates read/count helpers to the repository', async () => {
    mockSubsidiaryReadRepository.findById.mockResolvedValue({ id: 'subsidiary-1' });
    mockSubsidiaryReadRepository.findByCode.mockResolvedValue({ id: 'subsidiary-2' });
    mockSubsidiaryReadRepository.getChildrenCount.mockResolvedValue(3);
    mockSubsidiaryReadRepository.getTalentCount.mockResolvedValue(5);

    await expect(service.findById('subsidiary-1', 'tenant_test')).resolves.toEqual({
      id: 'subsidiary-1',
    });
    await expect(service.findByCode('TOKYO', 'tenant_test')).resolves.toEqual({
      id: 'subsidiary-2',
    });
    await expect(service.getChildrenCount('subsidiary-1', 'tenant_test')).resolves.toBe(3);
    await expect(service.getTalentCount('subsidiary-1', 'tenant_test')).resolves.toBe(5);
  });
});
