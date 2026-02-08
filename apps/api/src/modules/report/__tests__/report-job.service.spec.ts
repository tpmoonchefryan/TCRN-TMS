// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportJobStatus, ReportType } from '../dto/report.dto';
import { ReportJobService } from '../services/report-job.service';

// Mock dependencies
const mockPrisma = {
  talent: {
    findUnique: vi.fn(),
  },
  reportJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

const mockDatabaseService = {
  getPrisma: () => mockPrisma,
};

const mockStateService = {
  transition: vi.fn(),
};

const mockTechEventLog = {
  log: vi.fn(),
};

const mockMinioService = {
  getPresignedUrl: vi.fn(),
};

describe('ReportJobService', () => {
  let service: ReportJobService;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    service = new ReportJobService(
      mockDatabaseService as any,
      mockStateService as any,
      mockTechEventLog as any,
      mockMinioService as any,
    );
  });

  describe('create', () => {
    const validFilters = {
      platformCodes: ['YOUTUBE'],
      includeExpired: false,
    };

    it('should create a report job successfully', async () => {
      // Mock query for talent lookup
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        subsidiary_id: 'sub-123',
        profile_store_id: 'store-123',
      }]);
      
      // Mock query for job creation  
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.PENDING,
        created_at: new Date('2026-01-23T10:00:00Z'),
      }]);

      const result = await service.create(
        ReportType.MFR,
        'talent-123',
        validFilters,
        'xlsx',
        100,
        mockContext,
      );

      expect(result).toEqual({
        jobId: 'job-123',
        status: ReportJobStatus.PENDING,
        estimatedRows: 100,
        createdAt: '2026-01-23T10:00:00.000Z',
      });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(mockTechEventLog.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rows exceed 50000', async () => {
      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          'xlsx',
          60000, // Exceeds limit
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when talent not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          'xlsx',
          100,
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when talent has no profile store', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        subsidiary_id: 'sub-123',
        profile_store_id: null,
      }]);

      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          'xlsx',
          100,
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log tech event on job creation', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        subsidiary_id: 'sub-123',
        profile_store_id: 'store-123',
      }]);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.PENDING,
        created_at: new Date('2026-01-23T10:00:00Z'),
      }]);

      await service.create(
        ReportType.MFR,
        'talent-123',
        validFilters,
        'xlsx',
        100,
        mockContext,
      );

      expect(mockTechEventLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'export',
          payload: expect.objectContaining({
            action: 'report_job_created',
            reportType: ReportType.MFR,
          }),
        }),
        // Service passes context as second argument
        expect.anything(),
      );
    });
  });

  describe('Row limit validation', () => {
    it('should accept exactly 50000 rows', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        subsidiary_id: 'sub-123',
        profile_store_id: 'store-123',
      }]);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.PENDING,
        created_at: new Date(),
      }]);

      // Should not throw for exactly 50000
      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          {},
          'xlsx',
          50000,
          mockContext,
        ),
      ).resolves.toBeDefined();
    });

    it('should reject 50001 rows', async () => {
      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          {},
          'xlsx',
          50001,
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
