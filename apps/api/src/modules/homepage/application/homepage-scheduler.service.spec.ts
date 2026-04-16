// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TechEventLogService } from '../../log';
import {
  HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED_EVENT,
  HOMEPAGE_DRAFT_ARCHIVAL_FAILED_EVENT,
} from '../domain/homepage-scheduler.policy';
import { HomepageSchedulerRepository } from '../infrastructure/homepage-scheduler.repository';
import { HomepageSchedulerApplicationService } from './homepage-scheduler.service';

describe('HomepageSchedulerApplicationService', () => {
  let service: HomepageSchedulerApplicationService;

  const mockRepository = {
    listActiveTenantSchemas: vi.fn(),
    archiveOldDraftVersions: vi.fn(),
  };

  const mockTechEventLogService = {
    info: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T03:40:00.000Z'));

    service = new HomepageSchedulerApplicationService(
      mockRepository as unknown as HomepageSchedulerRepository,
      mockTechEventLogService as unknown as TechEventLogService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('archives old drafts across active tenant schemas and emits the completion tech event', async () => {
    mockRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_a', 'tenant_b']);
    mockRepository.archiveOldDraftVersions
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await service.archiveOldDrafts();

    const expectedCutoff = new Date('2026-03-15T03:40:00.000Z');

    expect(mockRepository.archiveOldDraftVersions).toHaveBeenNthCalledWith(
      1,
      'tenant_a',
      expectedCutoff,
    );
    expect(mockRepository.archiveOldDraftVersions).toHaveBeenNthCalledWith(
      2,
      'tenant_b',
      expectedCutoff,
    );
    expect(mockTechEventLogService.info).toHaveBeenCalledWith(
      HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED_EVENT,
      'Archived 5 old draft versions',
      {
        archivedCount: 5,
        cutoffDate: expectedCutoff,
      },
    );
  });

  it('does not emit the completion tech event when no drafts were archived', async () => {
    mockRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_a']);
    mockRepository.archiveOldDraftVersions.mockResolvedValue(0);

    await service.archiveOldDrafts();

    expect(mockTechEventLogService.info).not.toHaveBeenCalled();
  });

  it('emits the failure tech event when archival processing throws', async () => {
    const error = new Error('tenant lookup failed');
    mockRepository.listActiveTenantSchemas.mockRejectedValue(error);

    await service.archiveOldDrafts();

    expect(mockTechEventLogService.error).toHaveBeenCalledWith(
      HOMEPAGE_DRAFT_ARCHIVAL_FAILED_EVENT,
      'Failed to archive old draft versions',
      error,
    );
  });

  it('returns aggregated archival stats for manual triggers without emitting tech events', async () => {
    mockRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_a', 'tenant_b']);
    mockRepository.archiveOldDraftVersions
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4);

    await expect(service.triggerArchival()).resolves.toEqual({
      archived: 5,
      cutoffDate: new Date('2026-03-15T03:40:00.000Z'),
    });
    expect(mockTechEventLogService.info).not.toHaveBeenCalled();
    expect(mockTechEventLogService.error).not.toHaveBeenCalled();
  });
});
