// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LogSeverity, TechEventScope, TechEventType } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportJobStateService } from '../services/report-job-state.service';

const mockPrisma = {
  reportJob: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockDatabaseService = {
  getPrisma: () => mockPrisma,
};

const mockTechEventLog = {
  log: vi.fn(),
};

describe('ReportJobStateService', () => {
  let service: ReportJobStateService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ReportJobStateService(
      mockDatabaseService as never,
      mockTechEventLog as never,
    );
  });

  describe('checkAndExpireJobs', () => {
    it('logs a typed scheduled completion event when jobs expire', async () => {
      mockPrisma.reportJob.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.checkAndExpireJobs()).resolves.toBe(3);

      expect(mockPrisma.reportJob.updateMany).toHaveBeenCalled();
      expect(mockTechEventLog.log).toHaveBeenCalledWith({
        eventType: TechEventType.SCHEDULED_TASK_COMPLETED,
        scope: TechEventScope.SCHEDULED,
        severity: LogSeverity.INFO,
        payload: {
          task: 'report_expiry_check',
          expiredCount: 3,
        },
      });
    });

    it('skips the tech log when no jobs expire', async () => {
      mockPrisma.reportJob.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.checkAndExpireJobs()).resolves.toBe(0);

      expect(mockTechEventLog.log).not.toHaveBeenCalled();
    });
  });
});
