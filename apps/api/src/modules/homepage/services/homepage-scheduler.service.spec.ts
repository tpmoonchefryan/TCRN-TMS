// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageSchedulerApplicationService } from '../application/homepage-scheduler.service';
import { HomepageSchedulerService } from './homepage-scheduler.service';

describe('HomepageSchedulerService', () => {
  let service: HomepageSchedulerService;

  const mockApplicationService = {
    archiveOldDrafts: vi.fn(),
    processArchival: vi.fn(),
    triggerArchival: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HomepageSchedulerService(
      mockApplicationService as unknown as HomepageSchedulerApplicationService,
    );
  });

  it('delegates scheduled archival to the layered application service', async () => {
    await service.archiveOldDrafts();

    expect(mockApplicationService.archiveOldDrafts).toHaveBeenCalledTimes(1);
  });

  it('delegates archival processing to the layered application service', async () => {
    const result = {
      archived: 2,
      cutoffDate: new Date('2026-03-15T03:40:00.000Z'),
    };
    mockApplicationService.processArchival.mockResolvedValue(result);

    await expect(service.processArchival()).resolves.toEqual(result);
  });

  it('delegates manual triggers to the layered application service', async () => {
    const result = {
      archived: 3,
      cutoffDate: new Date('2026-03-15T03:40:00.000Z'),
    };
    mockApplicationService.triggerArchival.mockResolvedValue(result);

    await expect(service.triggerArchival()).resolves.toEqual(result);
  });
});
