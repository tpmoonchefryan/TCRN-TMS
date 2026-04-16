// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUCKETS } from '../../../minio';
import { MessageStatus } from '../../dto/marshmallow.dto';
import { MarshmallowExportService, MarshmallowExportStatus } from '../marshmallow-export.service';

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

describe('MarshmallowExportService', () => {
  let service: MarshmallowExportService;

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

    service = new MarshmallowExportService(
      mockDatabaseService as never,
      mockMinioService as never,
      mockTechEventLogService as never,
      mockExportQueue as never,
    );
  });

  describe('createExportJob', () => {
    it('creates and queues a marshmallow export job through the layered write path', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 'talent-123' }])
        .mockResolvedValueOnce([{
          id: 'job-123',
          status: MarshmallowExportStatus.PENDING,
          format: 'csv',
          file_name: null,
          file_path: null,
          total_records: 0,
          processed_records: 0,
          expires_at: null,
          created_at: new Date('2026-04-14T10:00:00Z'),
          completed_at: null,
        }]);

      await expect(
        service.createExportJob(
          'talent-123',
          {
            format: 'csv',
            status: [MessageStatus.APPROVED],
            includeRejected: false,
          },
          mockContext,
        ),
      ).resolves.toEqual({
        jobId: 'job-123',
        status: MarshmallowExportStatus.PENDING,
      });

      expect(mockExportQueue.add).toHaveBeenCalledWith(
        'marshmallow_export',
        {
          jobId: 'job-123',
          talentId: 'talent-123',
          tenantSchema: 'tenant_test',
          format: 'csv',
          filters: {
            status: [MessageStatus.APPROVED],
            startDate: undefined,
            endDate: undefined,
            includeRejected: false,
          },
        },
      );
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'job-123',
          payload: expect.objectContaining({
            job_id: 'job-123',
            talent_id: 'talent-123',
            format: 'csv',
          }),
        }),
        mockContext,
      );
    });

    it('rejects marshmallow export creation when the talent does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.createExportJob(
          'talent-404',
          { format: 'xlsx' },
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExportJob', () => {
    it('returns a mapped dedicated export job response', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: MarshmallowExportStatus.SUCCESS,
        format: 'csv',
        file_name: 'messages.csv',
        file_path: 'tenant_test/job-123/messages.csv',
        total_records: 8,
        processed_records: 8,
        expires_at: new Date('2026-04-21T10:00:00Z'),
        created_at: new Date('2026-04-14T10:00:00Z'),
        completed_at: new Date('2026-04-14T10:02:00Z'),
      }]);

      await expect(
        service.getExportJob('job-123', 'talent-123', 'tenant_test'),
      ).resolves.toEqual({
        id: 'job-123',
        status: MarshmallowExportStatus.SUCCESS,
        format: 'csv',
        fileName: 'messages.csv',
        totalRecords: 8,
        processedRecords: 8,
        downloadUrl: '/api/v1/talents/talent-123/marshmallow/export/job-123/download',
        expiresAt: '2026-04-21T10:00:00.000Z',
        createdAt: '2026-04-14T10:00:00.000Z',
        completedAt: '2026-04-14T10:02:00.000Z',
      });
    });

    it('falls back to legacy export_job rows for reads when the dedicated table misses', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          id: 'job-legacy',
          status: MarshmallowExportStatus.SUCCESS,
          format: 'json',
          file_name: 'messages.json',
          file_path: 'tenant_test/job-legacy/messages.json',
          total_records: 2,
          processed_records: 2,
          expires_at: new Date('2026-04-21T10:00:00Z'),
          created_at: new Date('2026-04-14T09:00:00Z'),
          completed_at: new Date('2026-04-14T09:05:00Z'),
        }]);

      await expect(
        service.getExportJob('job-legacy', 'talent-123', 'tenant_test'),
      ).resolves.toMatchObject({
        id: 'job-legacy',
        status: MarshmallowExportStatus.SUCCESS,
        format: 'json',
      });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0]?.[0]).toContain('marshmallow_export_job');
      expect(mockPrisma.$queryRawUnsafe.mock.calls[1]?.[0]).toContain('export_job');
      expect(mockPrisma.$queryRawUnsafe.mock.calls[1]?.[0]).toContain('talent_id = $2::uuid');
    });

    it('throws NotFoundException when the marshmallow export job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await expect(
        service.getExportJob('job-404', 'talent-123', 'tenant_test'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a presigned download URL for completed jobs scoped to the talent', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: MarshmallowExportStatus.SUCCESS,
        file_path: 'tenant_test/job-123/messages.csv',
      }]);
      mockMinioService.getPresignedUrl.mockReturnValue('https://download.example.com/messages.csv');

      await expect(
        service.getDownloadUrl('job-123', 'talent-123', 'tenant_test'),
      ).resolves.toBe('https://download.example.com/messages.csv');

      expect(mockMinioService.getPresignedUrl).toHaveBeenCalledWith(
        BUCKETS.TEMP_REPORTS,
        'tenant_test/job-123/messages.csv',
        3600,
      );
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0]?.[0]).toContain('talent_id = $2::uuid');
    });

    it('rejects download when the export is not ready', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: MarshmallowExportStatus.PENDING,
        file_path: null,
      }]);

      await expect(
        service.getDownloadUrl('job-123', 'talent-123', 'tenant_test'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('worker state paths', () => {
    it('falls back to the legacy table when updateProgress misses the dedicated table', async () => {
      mockPrisma.$executeRawUnsafe
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      await expect(
        service.updateProgress('job-123', 'tenant_test', 20, 5),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('marshmallow_export_job');
      expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('export_job');
      expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('job_type = $5');
    });

    it('completes jobs via the layered state service and logs the completion event', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.completeJob(
          'job-123',
          'tenant_test',
          'tenant_test/job-123/messages.csv',
          'messages.csv',
          20,
        ),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('marshmallow_export_job');
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'job-123',
          payload: expect.objectContaining({
            job_id: 'job-123',
            file_path: 'tenant_test/job-123/messages.csv',
            total_records: 20,
          }),
        }),
      );
    });

    it('fails jobs via the layered state service and logs the error', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.failJob('job-123', 'tenant_test', 'minio upload failed'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('marshmallow_export_job');
      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'job-123',
          payload: expect.objectContaining({
            job_id: 'job-123',
            error: 'minio upload failed',
          }),
        }),
      );
    });
  });
});
