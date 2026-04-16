// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUCKETS } from '../../minio';
import {
  ExportFormat,
  ExportJobStatus,
  ExportJobType,
} from '../dto/export.dto';
import { ExportJobService } from './export-job.service';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

const mockDatabaseService = {
  getPrisma: () => mockPrisma,
};

const mockMinioService = {
  getPresignedUrl: vi.fn(),
};

const mockTechEventLogService = {
  log: vi.fn(),
};

const mockExportQueue = {
  add: vi.fn(),
};

describe('ExportJobService', () => {
  let service: ExportJobService;

  const mockContext: RequestContext = {
    userId: 'user-123',
    userName: 'operator',
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$queryRawUnsafe.mockReset();
    mockPrisma.$executeRawUnsafe.mockReset();
    mockMinioService.getPresignedUrl.mockReset();
    mockTechEventLogService.log.mockReset();
    mockExportQueue.add.mockReset();

    service = new ExportJobService(
      mockDatabaseService as never,
      mockMinioService as never,
      mockTechEventLogService as never,
      mockExportQueue as never,
    );
  });

  describe('createJob', () => {
    it('creates and queues a customer export job using the layered write path', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{
          id: 'talent-123',
          profileStoreId: 'store-123',
          profileStoreIsActive: true,
        }])
        .mockResolvedValueOnce([{
          id: 'job-123',
          job_type: ExportJobType.CUSTOMER_EXPORT,
          format: ExportFormat.CSV,
          status: ExportJobStatus.PENDING,
          file_name: null,
          file_path: null,
          total_records: 0,
          processed_records: 0,
          expires_at: null,
          created_at: new Date('2026-04-13T10:00:00Z'),
          completed_at: null,
        }]);

      await expect(
        service.createJob(
          'talent-123',
          {
            jobType: ExportJobType.CUSTOMER_EXPORT,
            tags: ['vip'],
            fields: ['nickname'],
          },
          mockContext,
        ),
      ).resolves.toEqual({
        id: 'job-123',
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
        status: ExportJobStatus.PENDING,
        fileName: null,
        totalRecords: 0,
        processedRecords: 0,
        downloadUrl: null,
        expiresAt: null,
        createdAt: '2026-04-13T10:00:00.000Z',
        completedAt: null,
      });

      expect(mockExportQueue.add).toHaveBeenCalledWith(
        ExportJobType.CUSTOMER_EXPORT,
        {
          jobId: 'job-123',
          jobType: ExportJobType.CUSTOMER_EXPORT,
          talentId: 'talent-123',
          profileStoreId: 'store-123',
          format: ExportFormat.CSV,
          filters: {
            customerIds: undefined,
            tags: ['vip'],
            membershipClassCode: undefined,
            fields: ['nickname'],
          },
          tenantSchema: 'tenant_test',
        },
      );
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: expect.anything(),
          traceId: 'job-123',
          payload: expect.objectContaining({
            job_id: 'job-123',
            job_type: ExportJobType.CUSTOMER_EXPORT,
            format: ExportFormat.CSV,
            talent_id: 'talent-123',
          }),
        }),
        mockContext,
      );
    });

    it('rejects unsupported generic export job types', async () => {
      await expect(
        service.createJob(
          'talent-123',
          {
            jobType: 'report_export' as never,
          },
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the talent has no profile store configured', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        profileStoreId: null,
        profileStoreIsActive: null,
      }]);

      await expect(
        service.createJob(
          'talent-123',
          {
            jobType: ExportJobType.CUSTOMER_EXPORT,
          },
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('returns the mapped export job detail', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        job_type: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
        status: ExportJobStatus.SUCCESS,
        file_name: 'customers.csv',
        file_path: 'tenant_test/job-123/customers.csv',
        total_records: 10,
        processed_records: 10,
        expires_at: new Date('2026-04-20T10:00:00Z'),
        created_at: new Date('2026-04-13T10:00:00Z'),
        completed_at: new Date('2026-04-13T10:02:00Z'),
      }]);

      await expect(service.findById('job-123', mockContext)).resolves.toEqual({
        id: 'job-123',
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
        status: ExportJobStatus.SUCCESS,
        fileName: 'customers.csv',
        totalRecords: 10,
        processedRecords: 10,
        downloadUrl: '/api/v1/exports/job-123/download',
        expiresAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-13T10:00:00.000Z',
        completedAt: '2026-04-13T10:02:00.000Z',
      });
    });

    it('throws NotFoundException when the export job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.findById('job-404', mockContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMany', () => {
    it('returns mapped paginated items and total count', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{
          id: 'talent-123',
          profileStoreId: 'store-123',
          profileStoreIsActive: true,
        }])
        .mockResolvedValueOnce([{
          id: 'job-123',
          job_type: ExportJobType.CUSTOMER_EXPORT,
          format: ExportFormat.CSV,
          status: ExportJobStatus.PENDING,
          file_name: null,
          file_path: null,
          total_records: 10,
          processed_records: 0,
          expires_at: null,
          created_at: new Date('2026-04-13T10:00:00Z'),
          completed_at: null,
        }])
        .mockResolvedValueOnce([{ count: 1n }]);

      await expect(
        service.findMany(
          'talent-123',
          { status: ExportJobStatus.PENDING, page: 2, pageSize: 1 },
          mockContext,
        ),
      ).resolves.toEqual({
        items: [{
          id: 'job-123',
          jobType: ExportJobType.CUSTOMER_EXPORT,
          format: ExportFormat.CSV,
          status: ExportJobStatus.PENDING,
          fileName: null,
          totalRecords: 10,
          processedRecords: 0,
          downloadUrl: null,
          expiresAt: null,
          createdAt: '2026-04-13T10:00:00.000Z',
          completedAt: null,
        }],
        total: 1,
      });
    });

    it('returns an empty list when the talent has no profile store', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        profileStoreId: null,
        profileStoreIsActive: null,
      }]);

      await expect(
        service.findMany('talent-123', { page: 1, pageSize: 20 }, mockContext),
      ).resolves.toEqual({
        items: [],
        total: 0,
      });
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a presigned URL for a completed export', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ExportJobStatus.SUCCESS,
        file_path: 'tenant_test/job-123/customers.csv',
      }]);
      mockMinioService.getPresignedUrl.mockResolvedValueOnce('https://minio.example/customers.csv');

      await expect(service.getDownloadUrl('job-123', mockContext)).resolves.toBe(
        'https://minio.example/customers.csv',
      );

      expect(mockMinioService.getPresignedUrl).toHaveBeenCalledWith(
        BUCKETS.TEMP_REPORTS,
        'tenant_test/job-123/customers.csv',
        3600,
      );
    });

    it('throws BadRequestException when the export is not ready', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ExportJobStatus.RUNNING,
        file_path: null,
      }]);

      await expect(service.getDownloadUrl('job-123', mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the export job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.getDownloadUrl('job-404', mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelJob', () => {
    it('cancels a pending export job through the layered write path', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ExportJobStatus.PENDING,
      }]);

      await expect(service.cancelJob('job-123', mockContext)).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $1'),
        ExportJobStatus.CANCELLED,
        'job-123',
        ExportJobType.CUSTOMER_EXPORT,
      );
    });

    it('throws NotFoundException when cancelling a missing export job', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.cancelJob('job-404', mockContext)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when cancelling a completed export job', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ExportJobStatus.SUCCESS,
      }]);

      await expect(service.cancelJob('job-123', mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('worker state paths', () => {
    it('updates progress through the layered state path', async () => {
      await expect(
        service.updateProgress('job-123', 20, 5, 'tenant_test'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('started_at = COALESCE(started_at, NOW())'),
        20,
        5,
        ExportJobStatus.RUNNING,
        'job-123',
        ExportJobType.CUSTOMER_EXPORT,
      );
    });

    it('marks a job as completed and logs the completion event', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-13T10:00:00Z'));

      try {
        await expect(
          service.completeJob(
            'job-123',
            'tenant_test/job-123/customers.csv',
            'customers.csv',
            20,
            'tenant_test',
          ),
        ).resolves.toBeUndefined();
      } finally {
        vi.useRealTimers();
      }

      const completeCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(completeCall[1]).toBe(ExportJobStatus.SUCCESS);
      expect(completeCall[2]).toBe('tenant_test/job-123/customers.csv');
      expect(completeCall[3]).toBe('customers.csv');
      expect(completeCall[4]).toBe(20);
      expect((completeCall[5] as Date).toISOString()).toBe('2026-04-20T10:00:00.000Z');
      expect(completeCall[6]).toBe('job-123');
      expect(completeCall[7]).toBe(ExportJobType.CUSTOMER_EXPORT);
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            job_id: 'job-123',
            file_path: 'tenant_test/job-123/customers.csv',
            total_records: 20,
          }),
        }),
      );
    });

    it('marks a job as failed and logs the failure event', async () => {
      await expect(
        service.failJob('job-123', 'minio upload failed', 'tenant_test'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('error_message = $2'),
        ExportJobStatus.FAILED,
        'minio upload failed',
        'job-123',
        ExportJobType.CUSTOMER_EXPORT,
      );
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            job_id: 'job-123',
            error: 'minio upload failed',
          }),
        }),
      );
    });
  });
});
