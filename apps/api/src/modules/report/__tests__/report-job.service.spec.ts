// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUCKETS } from '../../minio';
import { ReportFormat, ReportJobStatus, ReportType } from '../dto/report.dto';
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
  canDownload: vi.fn(),
};

const mockTechEventLog = {
  log: vi.fn(),
};

const mockMinioService = {
  getPresignedUrl: vi.fn(),
};

const mockReportPiiPlatformApplicationService = {
  createMfrReportRequest: vi.fn(),
};

describe('ReportJobService', () => {
  let service: ReportJobService;

  const mockContext = {
    userId: 'user-123',
    userName: 'operator',
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    service = new ReportJobService(
      mockDatabaseService as any,
      mockStateService as any,
      mockTechEventLog as any,
      mockMinioService as any,
      mockReportPiiPlatformApplicationService as any,
    );
  });

  describe('create', () => {
    const validFilters = {
      platformCodes: ['YOUTUBE'],
      includeExpired: false,
    };

    it('should create a report job successfully', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue(null);

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
        ReportFormat.XLSX,
        100,
        mockContext,
      );

      expect(result).toEqual({
        deliveryMode: 'tms_job',
        jobId: 'job-123',
        status: ReportJobStatus.PENDING,
        estimatedRows: 100,
        createdAt: '2026-01-23T10:00:00.000Z',
      });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(mockTechEventLog.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rows exceed 50000', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue(null);

      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          ReportFormat.XLSX,
          60000, // Exceeds limit
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when talent not found', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue(null);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          ReportFormat.XLSX,
          100,
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when talent has no profile store', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue(null);
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
          ReportFormat.XLSX,
          100,
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log tech event on job creation', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue(null);
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
        ReportFormat.XLSX,
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

    it('returns a pii-platform redirect response when an external handoff is enabled', async () => {
      mockReportPiiPlatformApplicationService.createMfrReportRequest.mockResolvedValue({
        deliveryMode: 'pii_platform_portal',
        requestId: 'report-request-1',
        redirectUrl: 'https://pii-platform.example.com/portal/report-requests/report-request-1',
        expiresAt: '2026-04-15T02:00:00.000Z',
        estimatedRows: 100,
        customerCount: 64,
      });

      await expect(
        service.create(
          ReportType.MFR,
          'talent-123',
          validFilters,
          ReportFormat.XLSX,
          100,
          mockContext,
        ),
      ).resolves.toEqual({
        deliveryMode: 'pii_platform_portal',
        requestId: 'report-request-1',
        redirectUrl: 'https://pii-platform.example.com/portal/report-requests/report-request-1',
        expiresAt: '2026-04-15T02:00:00.000Z',
        estimatedRows: 100,
        customerCount: 64,
      });

      expect(mockReportPiiPlatformApplicationService.createMfrReportRequest).toHaveBeenCalledWith(
        ReportType.MFR,
        'talent-123',
        validFilters,
        ReportFormat.XLSX,
        100,
        mockContext,
      );
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the mapped report job detail', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        report_type: ReportType.MFR,
        status: ReportJobStatus.SUCCESS,
        total_rows: 100,
        processed_rows: 100,
        progress_percentage: 100,
        error_code: null,
        error_message: null,
        file_name: 'report.xlsx',
        file_size_bytes: 2048n,
        queued_at: new Date('2026-01-23T10:00:00Z'),
        started_at: new Date('2026-01-23T10:00:05Z'),
        completed_at: new Date('2026-01-23T10:02:00Z'),
        expires_at: new Date('2026-01-23T10:07:00Z'),
        created_at: new Date('2026-01-23T10:00:00Z'),
        creator_id: 'user-123',
        creator_username: 'operator',
      }]);

      await expect(
        service.findById('job-123', 'talent-123', mockContext as any),
      ).resolves.toEqual({
        id: 'job-123',
        reportType: ReportType.MFR,
        status: ReportJobStatus.SUCCESS,
        progress: {
          totalRows: 100,
          processedRows: 100,
          percentage: 100,
        },
        error: undefined,
        fileName: 'report.xlsx',
        fileSizeBytes: 2048,
        queuedAt: '2026-01-23T10:00:00.000Z',
        startedAt: '2026-01-23T10:00:05.000Z',
        completedAt: '2026-01-23T10:02:00.000Z',
        expiresAt: '2026-01-23T10:07:00.000Z',
        createdAt: '2026-01-23T10:00:00.000Z',
        createdBy: {
          id: 'user-123',
          username: 'operator',
        },
      });
    });

    it('throws NotFoundException when the report job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.findById('job-404', 'talent-123', mockContext as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMany', () => {
    it('returns mapped paginated items and total count', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{
          id: 'job-123',
          report_type: ReportType.MFR,
          status: ReportJobStatus.SUCCESS,
          total_rows: 100,
          file_name: 'report.xlsx',
          created_at: new Date('2026-01-23T10:00:00Z'),
          completed_at: new Date('2026-01-23T10:02:00Z'),
          expires_at: new Date('2026-01-23T10:07:00Z'),
        }])
        .mockResolvedValueOnce([{ count: 1n }]);

      await expect(
        service.findMany({
          talentId: 'talent-123',
          status: 'pending,success',
          createdFrom: '2026-01-01T00:00:00.000Z',
          createdTo: '2026-01-31T23:59:59.999Z',
          page: 2,
          pageSize: 1,
        }, mockContext as any),
      ).resolves.toEqual({
        items: [{
          id: 'job-123',
          reportType: ReportType.MFR,
          status: ReportJobStatus.SUCCESS,
          totalRows: 100,
          fileName: 'report.xlsx',
          createdAt: '2026-01-23T10:00:00.000Z',
          completedAt: '2026-01-23T10:02:00.000Z',
          expiresAt: '2026-01-23T10:07:00.000Z',
        }],
        total: 1,
      });
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a presigned URL and marks a successful job as consumed on first download', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.SUCCESS,
        file_path: 'tenant_test/job-123/report.xlsx',
        file_name: 'report.xlsx',
      }]);
      mockStateService.canDownload.mockResolvedValueOnce(true);
      mockMinioService.getPresignedUrl.mockResolvedValueOnce('https://minio.example/report.xlsx');

      await expect(
        service.getDownloadUrl('job-123', 'talent-123', mockContext as any),
      ).resolves.toEqual({
        downloadUrl: 'https://minio.example/report.xlsx',
        expiresIn: 300,
        fileName: 'report.xlsx',
      });

      expect(mockStateService.transition).toHaveBeenCalledWith(
        'job-123',
        ReportJobStatus.CONSUMED,
      );
      expect(mockMinioService.getPresignedUrl).toHaveBeenCalledWith(
        BUCKETS.TEMP_REPORTS,
        'tenant_test/job-123/report.xlsx',
        300,
      );
      expect(mockTechEventLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            action: 'report_downloaded',
            jobId: 'job-123',
            fileName: 'report.xlsx',
          }),
        }),
        expect.anything(),
      );
    });

    it('throws NotFoundException when the report job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.getDownloadUrl('job-404', 'talent-123', mockContext as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the report is not downloadable', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.RUNNING,
        file_path: 'tenant_test/job-123/report.xlsx',
        file_name: 'report.xlsx',
      }]);
      mockStateService.canDownload.mockResolvedValueOnce(false);

      await expect(
        service.getDownloadUrl('job-123', 'talent-123', mockContext as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockMinioService.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the report file path is missing', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.CONSUMED,
        file_path: null,
        file_name: 'report.xlsx',
      }]);
      mockStateService.canDownload.mockResolvedValueOnce(true);

      await expect(
        service.getDownloadUrl('job-123', 'talent-123', mockContext as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockStateService.transition).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels a pending job and records the change log', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.PENDING,
      }]);

      await expect(
        service.cancel('job-123', 'talent-123', mockContext as any),
      ).resolves.toEqual({
        id: 'job-123',
        status: ReportJobStatus.CANCELLED,
      });

      expect(mockStateService.transition).toHaveBeenCalledWith(
        'job-123',
        ReportJobStatus.CANCELLED,
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('rejects cancelling a non-cancellable job state', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ReportJobStatus.RUNNING,
      }]);

      await expect(
        service.cancel('job-123', 'talent-123', mockContext as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when cancelling a missing job', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.cancel('job-404', 'talent-123', mockContext as any),
      ).rejects.toThrow(NotFoundException);
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
          ReportFormat.XLSX,
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
          ReportFormat.XLSX,
          50001,
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
