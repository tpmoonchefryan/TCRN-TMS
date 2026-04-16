// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { talentApi } from '@/lib/api/modules/talent';

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

describe('talentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the lifecycle endpoint set on publish/disable/re-enable and does not expose legacy verbs', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPost.mockResolvedValue({ success: true, data: {} });

    await talentApi.getPublishReadiness('talent-1');
    await talentApi.publish('talent-1', { version: 3 });
    await talentApi.disable('talent-1', { version: 4 });
    await talentApi.reEnable('talent-1', { version: 5 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/talents/talent-1/publish-readiness');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/talents/talent-1/publish', {
      version: 3,
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/talents/talent-1/disable', {
      version: 4,
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/api/v1/talents/talent-1/re-enable', {
      version: 5,
    });
    expect('deactivate' in talentApi).toBe(false);
    expect('reactivate' in talentApi).toBe(false);
  });

  it('keeps adjacent core talent routes on their current endpoints without re-exposing move', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });
    mockDelete.mockResolvedValue({ success: true, data: {} });

    await talentApi.list('subsidiary-1');
    await talentApi.get('talent-1');
    await talentApi.create({
      code: 'TAL001',
      nameEn: 'Talent One',
      displayName: 'Talent One',
      profileStoreId: 'store-1',
    });
    await talentApi.update('talent-1', {
      displayName: 'Talent One Updated',
      version: 2,
    });
    await talentApi.delete('talent-1', 6);

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/talents', { subsidiaryId: 'subsidiary-1' });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/talents/talent-1');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/talents', {
      code: 'TAL001',
      nameEn: 'Talent One',
      displayName: 'Talent One',
      profileStoreId: 'store-1',
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/talents/talent-1', {
      displayName: 'Talent One Updated',
      version: 2,
    });
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/talents/talent-1?version=6');
    expect('delete' in talentApi).toBe(true);
    expect('move' in talentApi).toBe(false);
  });
});
