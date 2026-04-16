// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageVersionApplicationService } from '../application/homepage-version.service';
import { HomepageVersionService } from './homepage-version.service';

describe('HomepageVersionService', () => {
  let service: HomepageVersionService;

  const mockApplicationService = {
    listVersions: vi.fn(),
    getVersion: vi.fn(),
    restoreVersion: vi.fn(),
  };

  const mockContext: RequestContext = {
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    userId: 'user-123',
    userName: 'Operator',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HomepageVersionService(
      mockApplicationService as unknown as HomepageVersionApplicationService,
    );
  });

  it('delegates version list queries to the layered application service', async () => {
    mockApplicationService.listVersions.mockResolvedValue({
      items: [],
      total: 0,
    });

    await expect(
      service.listVersions('talent-1', { page: 1, pageSize: 20 }, mockContext),
    ).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('delegates version detail reads to the layered application service', async () => {
    mockApplicationService.getVersion.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      status: 'published',
      content: { version: '1.0', components: [] },
      theme: { preset: 'default' },
      publishedAt: null,
      publishedBy: null,
      createdAt: '2026-04-13T09:30:00.000Z',
      createdBy: null,
    });

    await expect(
      service.getVersion('talent-1', 'version-2', mockContext),
    ).resolves.toEqual({
      id: 'version-2',
      versionNumber: 2,
      status: 'published',
      content: { version: '1.0', components: [] },
      theme: { preset: 'default' },
      publishedAt: null,
      publishedBy: null,
      createdAt: '2026-04-13T09:30:00.000Z',
      createdBy: null,
    });
  });

  it('keeps restore responses available through the compatibility facade', async () => {
    mockApplicationService.restoreVersion.mockResolvedValue({
      newDraftVersion: { id: 'version-5', versionNumber: 5 },
      restoredFrom: { id: 'version-2', versionNumber: 2 },
    });

    await expect(
      service.restoreVersion('talent-1', 'version-2', mockContext),
    ).resolves.toEqual({
      newDraftVersion: { id: 'version-5', versionNumber: 5 },
      restoredFrom: { id: 'version-2', versionNumber: 2 },
    });
  });
});
