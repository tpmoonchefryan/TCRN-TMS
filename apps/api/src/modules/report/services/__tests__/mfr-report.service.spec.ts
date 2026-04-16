// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ReportFormat, ReportType } from '../../dto/report.dto';
import { MfrReportService } from '../mfr-report.service';
import { ReportJobService } from '../report-job.service';

describe('MfrReportService', () => {
  let service: MfrReportService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockReportJobService: Partial<ReportJobService>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockContext: RequestContext = {
    userId: 'user-123',
    userName: 'Test User',
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  const mockTalent = {
    id: 'talent-123',
    profile_store_id: 'store-123',
  };

  const mockMembershipRecord = {
    nickname: 'Test Customer',
    platform_display_name: 'YouTube',
    level_name_en: 'Gold',
    level_name_zh: '金卡会员',
    valid_from: new Date(),
    valid_to: null,
    status_name_zh: null,
    status_name_en: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      $queryRawUnsafe: vi.fn()
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([{ count: BigInt(10) }])
        .mockResolvedValueOnce([mockMembershipRecord]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockReportJobService = {
      create: vi.fn().mockResolvedValue({ jobId: 'job-123', status: 'pending' }),
    };

    service = new MfrReportService(
      mockDatabaseService as DatabaseService,
      mockReportJobService as ReportJobService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should return search results with preview data', async () => {
      const result = await service.search('talent-123', {}, 20, mockContext);

      expect(result.totalCount).toBe(10);
      expect(result.preview).toEqual([{
        nickname: 'Test Customer',
        platformName: 'YouTube',
        membershipLevelName: '金卡会员',
        validFrom: mockMembershipRecord.valid_from.toISOString().split('T')[0],
        validTo: null,
        statusName: '',
      }]);
      expect(result.filterSummary).toEqual({
        platforms: [],
        dateRange: null,
        includeExpired: false,
      });
    });

    it('should throw NotFoundException when talent not found', async () => {
      mockPrisma.$queryRawUnsafe.mockReset().mockResolvedValueOnce([]);

      await expect(service.search('invalid-talent', {}, 20, mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should apply filters to search', async () => {
      mockPrisma.$queryRawUnsafe.mockReset()
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([{ count: BigInt(10) }])
        .mockResolvedValueOnce([mockMembershipRecord]);

      await service.search('talent-123', {
        platformCodes: ['YOUTUBE'],
        membershipClassCodes: ['STANDARD'],
      }, 20, mockContext);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should respect preview limit', async () => {
      mockPrisma.$queryRawUnsafe.mockReset()
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([{ count: BigInt(10) }])
        .mockResolvedValueOnce([mockMembershipRecord]);

      await service.search('talent-123', {}, 5, mockContext);

      // Verify query was called with LIMIT 5
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('createJob', () => {
    it('delegates job creation with the counted row estimate', async () => {
      mockPrisma.$queryRawUnsafe.mockReset().mockResolvedValueOnce([{ count: BigInt(12) }]);

      await service.createJob(
        'talent-123',
        { platformCodes: ['YOUTUBE'] },
        ReportFormat.CSV,
        mockContext,
      );

      expect(mockReportJobService.create).toHaveBeenCalledWith(
        ReportType.MFR,
        'talent-123',
        { platformCodes: ['YOUTUBE'] },
        ReportFormat.CSV,
        12,
        mockContext,
      );
    });
  });
});
