// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageVersionRepository } from '../infrastructure/homepage-version.repository';
import { HomepageVersionApplicationService } from './homepage-version.service';

describe('HomepageVersionApplicationService', () => {
  let service: HomepageVersionApplicationService;

  const mockRepository = {
    findHomepageIdByTalentId: vi.fn(),
    findHomepageVersions: vi.fn(),
    countHomepageVersions: vi.fn(),
    findSystemUsersByIds: vi.fn(),
    findHomepageVersionDetail: vi.fn(),
    findHomepageVersionRestoreSource: vi.fn(),
    findLatestHomepageVersionNumber: vi.fn(),
    createDraftVersionFromSource: vi.fn(),
    assignDraftVersion: vi.fn(),
    insertRestoreChangeLog: vi.fn(),
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
    service = new HomepageVersionApplicationService(
      mockRepository as unknown as HomepageVersionRepository,
    );
  });

  it('builds version list items through the layered repository and policy boundaries', async () => {
    mockRepository.findHomepageIdByTalentId.mockResolvedValue('homepage-1');
    mockRepository.findHomepageVersions.mockResolvedValue([
      {
        id: 'version-2',
        versionNumber: 2,
        status: 'published',
        content: {
          version: '1.0',
          components: [
            { id: '1', type: 'ProfileCard', props: {}, order: 1, visible: true },
            { id: '2', type: 'SocialLinks', props: {}, order: 2, visible: true },
            { id: '3', type: 'ImageGallery', props: {}, order: 3, visible: true },
            { id: '4', type: 'Schedule', props: {}, order: 4, visible: true },
          ],
        },
        publishedAt: new Date('2026-04-13T09:35:00.000Z'),
        publishedBy: 'user-2',
        createdAt: new Date('2026-04-13T09:30:00.000Z'),
        createdBy: 'user-1',
      },
    ]);
    mockRepository.countHomepageVersions.mockResolvedValue(1);
    mockRepository.findSystemUsersByIds.mockResolvedValue([
      { id: 'user-1', username: 'creator' },
      { id: 'user-2', username: 'publisher' },
    ]);

    await expect(
      service.listVersions('talent-1', { page: 1, pageSize: 20 }, mockContext),
    ).resolves.toEqual({
      items: [
        {
          id: 'version-2',
          versionNumber: 2,
          status: 'published',
          contentPreview: 'ProfileCard, SocialLinks, ImageGallery... (+1)',
          componentCount: 4,
          publishedAt: '2026-04-13T09:35:00.000Z',
          publishedBy: { id: 'user-2', username: 'publisher' },
          createdAt: '2026-04-13T09:30:00.000Z',
          createdBy: { id: 'user-1', username: 'creator' },
        },
      ],
      total: 1,
    });
  });

  it('throws when the homepage does not exist for the target talent', async () => {
    mockRepository.findHomepageIdByTalentId.mockResolvedValue(null);

    await expect(
      service.listVersions('talent-missing', { page: 1, pageSize: 20 }, mockContext),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds version detail through the layered repository and actor lookup', async () => {
    mockRepository.findHomepageIdByTalentId.mockResolvedValue('homepage-1');
    mockRepository.findHomepageVersionDetail.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      status: 'published',
      content: { version: '1.0', components: [] },
      theme: { preset: 'default' },
      publishedAt: new Date('2026-04-13T09:35:00.000Z'),
      publishedBy: 'user-2',
      createdAt: new Date('2026-04-13T09:30:00.000Z'),
      createdBy: 'user-1',
    });
    mockRepository.findSystemUsersByIds.mockResolvedValue([
      { id: 'user-1', username: 'creator' },
      { id: 'user-2', username: 'publisher' },
    ]);

    await expect(
      service.getVersion('talent-1', 'version-2', mockContext),
    ).resolves.toEqual({
      id: 'version-2',
      versionNumber: 2,
      status: 'published',
      content: { version: '1.0', components: [] },
      theme: { preset: 'default' },
      publishedAt: '2026-04-13T09:35:00.000Z',
      publishedBy: { id: 'user-2', username: 'publisher' },
      createdAt: '2026-04-13T09:30:00.000Z',
      createdBy: { id: 'user-1', username: 'creator' },
    });
  });

  it('restores a historical version into a new draft version', async () => {
    mockRepository.findHomepageIdByTalentId.mockResolvedValue('homepage-1');
    mockRepository.findHomepageVersionRestoreSource.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      content: { version: '1.0', components: [] },
      theme: { preset: 'default' },
      contentHash: 'hash-123',
    });
    mockRepository.findLatestHomepageVersionNumber.mockResolvedValue(4);
    mockRepository.createDraftVersionFromSource.mockResolvedValue({
      id: 'version-5',
      versionNumber: 5,
    });
    mockRepository.assignDraftVersion.mockResolvedValue(undefined);
    mockRepository.insertRestoreChangeLog.mockResolvedValue(undefined);

    await expect(
      service.restoreVersion('talent-1', 'version-2', mockContext),
    ).resolves.toEqual({
      newDraftVersion: {
        id: 'version-5',
        versionNumber: 5,
      },
      restoredFrom: {
        id: 'version-2',
        versionNumber: 2,
      },
    });
  });
});
