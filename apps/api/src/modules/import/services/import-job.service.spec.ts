// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ImportJobStatus,
  ImportJobType,
} from '../dto/import.dto';
import { ImportJobService } from './import-job.service';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

const mockDatabaseService = {
  getPrisma: () => mockPrisma,
};

const mockMinioService = {};

const mockTechEventLogService = {
  log: vi.fn(),
};

describe('ImportJobService', () => {
  let service: ImportJobService;

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
    mockTechEventLogService.log.mockReset();
    service = new ImportJobService(
      mockDatabaseService as never,
      mockMinioService as never,
      mockTechEventLogService as never,
    );
  });

  describe('createJob', () => {
    it('creates an import job through the layered write path', async () => {
      const createdAt = new Date('2026-04-13T12:00:00Z');

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{
          id: 'talent-123',
          profileStoreId: 'store-123',
          profileStoreIsActive: true,
        }])
        .mockResolvedValueOnce([{
          id: 'consumer-123',
        }])
        .mockResolvedValueOnce([{
          id: 'job-123',
          job_type: ImportJobType.INDIVIDUAL_IMPORT,
          status: ImportJobStatus.PENDING,
          file_name: 'customers.csv',
          total_rows: 12,
          processed_rows: 0,
          success_rows: 0,
          failed_rows: 0,
          warning_rows: 0,
          started_at: null,
          completed_at: null,
          created_at: createdAt,
          created_by: 'user-123',
        }]);

      await expect(
        service.createJob(
          ImportJobType.INDIVIDUAL_IMPORT,
          'talent-123',
          'customers.csv',
          2048,
          12,
          'CRM_SYSTEM',
          mockContext,
        ),
      ).resolves.toEqual({
        id: 'job-123',
        status: ImportJobStatus.PENDING,
        fileName: 'customers.csv',
        totalRows: 12,
        createdAt,
        profileStoreId: 'store-123',
      });

      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'job-123',
          payload: expect.objectContaining({
            job_id: 'job-123',
            job_type: ImportJobType.INDIVIDUAL_IMPORT,
            talent_id: 'talent-123',
          }),
        }),
        mockContext,
      );
    });

    it('throws when the talent has no profile store configured', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'talent-123',
        profileStoreId: null,
        profileStoreIsActive: null,
      }]);

      await expect(
        service.createJob(
          ImportJobType.COMPANY_IMPORT,
          'talent-123',
          'companies.csv',
          1024,
          3,
          undefined,
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('returns the mapped import job detail', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        job_type: ImportJobType.INDIVIDUAL_IMPORT,
        status: ImportJobStatus.SUCCESS,
        file_name: 'customers.csv',
        total_rows: 10,
        processed_rows: 10,
        success_rows: 9,
        failed_rows: 1,
        warning_rows: 1,
        started_at: new Date('2026-04-13T12:00:05Z'),
        completed_at: new Date('2026-04-13T12:00:30Z'),
        created_at: new Date('2026-04-13T12:00:00Z'),
        created_by: 'user-123',
        consumer_code: 'CRM_SYSTEM',
      }]);

      await expect(service.findById('job-123', 'talent-123', mockContext)).resolves.toEqual({
        id: 'job-123',
        jobType: ImportJobType.INDIVIDUAL_IMPORT,
        status: ImportJobStatus.SUCCESS,
        fileName: 'customers.csv',
        consumerCode: 'CRM_SYSTEM',
        progress: {
          totalRows: 10,
          processedRows: 10,
          successRows: 9,
          failedRows: 1,
          warningRows: 1,
          percentage: 100,
        },
        startedAt: '2026-04-13T12:00:05.000Z',
        completedAt: '2026-04-13T12:00:30.000Z',
        estimatedRemainingSeconds: null,
        createdAt: '2026-04-13T12:00:00.000Z',
        createdBy: {
          id: 'user-123',
          username: 'unknown',
        },
      });
    });

    it('throws NotFoundException when the import job does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.findById('job-404', 'talent-123', mockContext)).rejects.toThrow(
        NotFoundException,
      );
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
          job_type: ImportJobType.COMPANY_IMPORT,
          status: ImportJobStatus.PENDING,
          file_name: 'companies.csv',
          total_rows: 5,
          processed_rows: 0,
          success_rows: 0,
          failed_rows: 0,
          warning_rows: 0,
          started_at: null,
          completed_at: null,
          created_at: new Date('2026-04-13T12:00:00Z'),
          created_by: 'user-123',
          consumer_code: null,
        }])
        .mockResolvedValueOnce([{ count: 1n }]);

      await expect(
        service.findMany(
          'talent-123',
          { status: ImportJobStatus.PENDING, page: 2, pageSize: 1 },
          mockContext,
        ),
      ).resolves.toEqual({
        items: [{
          id: 'job-123',
          jobType: ImportJobType.COMPANY_IMPORT,
          status: ImportJobStatus.PENDING,
          fileName: 'companies.csv',
          consumerCode: null,
          progress: {
            totalRows: 5,
            processedRows: 0,
            successRows: 0,
            failedRows: 0,
            warningRows: 0,
            percentage: 0,
          },
          startedAt: null,
          completedAt: null,
          estimatedRemainingSeconds: null,
          createdAt: '2026-04-13T12:00:00.000Z',
          createdBy: {
            id: 'user-123',
            username: 'unknown',
          },
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

  describe('getErrors', () => {
    it('maps import-job errors through the layered read path', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          row_number: 2,
          error_code: 'VALIDATION_ERROR',
          error_message: 'Nickname is required',
          original_data: '{"nickname":""}',
        },
      ]);

      await expect(service.getErrors('job-123', 'talent-123', mockContext)).resolves.toEqual([
        {
          rowNumber: 2,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Nickname is required',
          originalData: '{"nickname":""}',
        },
      ]);
    });
  });

  describe('cancelJob', () => {
    it('cancels a pending import job through the layered write path', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ImportJobStatus.PENDING,
      }]);
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.cancelJob('job-123', 'talent-123', mockContext),
      ).resolves.toBeUndefined();

      const cancelCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(cancelCall[1]).toBe(ImportJobStatus.CANCELLED);
      expect(cancelCall[2]).toBe('job-123');
    });

    it('throws NotFoundException when cancelling a missing import job', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.cancelJob('job-404', 'talent-123', mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when cancelling a completed import job', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
        id: 'job-123',
        status: ImportJobStatus.SUCCESS,
      }]);

      await expect(service.cancelJob('job-123', 'talent-123', mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('worker state path', () => {
    it('updates progress through the layered state path', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.updateProgress('job-123', 20, 18, 2, 1, 'tenant_test'),
      ).resolves.toBeUndefined();

      const updateCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(updateCall[1]).toBe(20);
      expect(updateCall[2]).toBe(18);
      expect(updateCall[3]).toBe(2);
      expect(updateCall[4]).toBe(1);
      expect(updateCall[5]).toBe(ImportJobStatus.RUNNING);
      expect(updateCall[6]).toBe('job-123');
    });

    it.each([
      {
        name: 'success',
        successRows: 5,
        failedRows: 0,
        warningRows: 1,
        expectedStatus: ImportJobStatus.SUCCESS,
      },
      {
        name: 'partial',
        successRows: 5,
        failedRows: 2,
        warningRows: 1,
        expectedStatus: ImportJobStatus.PARTIAL,
      },
      {
        name: 'failed',
        successRows: 0,
        failedRows: 2,
        warningRows: 0,
        expectedStatus: ImportJobStatus.FAILED,
      },
    ])('completes an import job with $name status through the layered state path', async ({
      successRows,
      failedRows,
      warningRows,
      expectedStatus,
    }) => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.completeJob('job-123', successRows, failedRows, warningRows, 'tenant_test'),
      ).resolves.toBeUndefined();

      const completeCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(completeCall[1]).toBe(expectedStatus);
      expect(completeCall[2]).toBe(successRows + failedRows);
      expect(completeCall[3]).toBe(successRows);
      expect(completeCall[4]).toBe(failedRows);
      expect(completeCall[5]).toBe(warningRows);
      expect(completeCall[6]).toBe('job-123');

      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'job-123',
          payload: expect.objectContaining({
            status: expectedStatus,
            success_rows: successRows,
            failed_rows: failedRows,
            warning_rows: warningRows,
          }),
        }),
      );
    });

    it('persists import-job row errors through the layered state path', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        service.addError(
          'job-123',
          7,
          'VALIDATION_ERROR',
          'Nickname is required',
          '{"nickname":""}',
          'tenant_test',
        ),
      ).resolves.toBeUndefined();

      const addErrorCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(addErrorCall[1]).toBe('job-123');
      expect(addErrorCall[2]).toBe(7);
      expect(addErrorCall[3]).toBe('VALIDATION_ERROR');
      expect(addErrorCall[4]).toBe('Nickname is required');
      expect(addErrorCall[5]).toBe('{"nickname":""}');
    });
  });
});
