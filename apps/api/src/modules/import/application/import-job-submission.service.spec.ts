// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportJobStatus, ImportJobType } from '../dto/import.dto';
import { ImportJobSubmissionApplicationService } from './import-job-submission.service';

describe('ImportJobSubmissionApplicationService', () => {
  const mockImportJobWriteApplicationService = {
    createJob: vi.fn(),
  };

  const mockMinioService = {
    uploadStream: vi.fn(),
  };

  const mockImportQueue = {
    add: vi.fn(),
  };

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  let service: ImportJobSubmissionApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImportJobSubmissionApplicationService(
      mockImportJobWriteApplicationService as never,
      mockMinioService as never,
      mockImportQueue as never,
    );
  });

  it('creates the import job row, uploads the source file, and enqueues the worker payload', async () => {
    const createdAt = new Date('2026-04-13T13:00:00Z');
    const fileBuffer = Buffer.from('external_id,nickname\nEXT001,Queued User', 'utf8');

    mockImportJobWriteApplicationService.createJob.mockResolvedValueOnce({
      id: 'job-123',
      status: ImportJobStatus.PENDING,
      fileName: 'customers.csv',
      totalRows: 1,
      createdAt,
      profileStoreId: 'store-123',
    });

    await expect(
      service.submitCustomerCreateJob({
        jobType: ImportJobType.INDIVIDUAL_IMPORT,
        talentId: 'talent-123',
        fileName: 'customers.csv',
        fileBuffer,
        fileSize: fileBuffer.byteLength,
        totalRows: 1,
        consumerCode: 'CRM_SYSTEM',
        defaultProfileType: 'individual',
        context: mockContext,
      }),
    ).resolves.toEqual({
      id: 'job-123',
      status: ImportJobStatus.PENDING,
      fileName: 'customers.csv',
      totalRows: 1,
      createdAt,
    });

    expect(mockImportJobWriteApplicationService.createJob).toHaveBeenCalledWith(
      ImportJobType.INDIVIDUAL_IMPORT,
      'talent-123',
      'customers.csv',
      fileBuffer.byteLength,
      1,
      'CRM_SYSTEM',
      mockContext,
    );

    expect(mockMinioService.uploadStream).toHaveBeenCalledWith(
      'imports',
      'tenant_test/job-123.csv',
      expect.anything(),
      fileBuffer.byteLength,
      'text/csv',
    );

    expect(mockImportQueue.add).toHaveBeenCalledWith('process-import', {
      jobId: 'job-123',
      tenantId: 'tenant-123',
      tenantSchemaName: 'tenant_test',
      jobType: 'customer_create',
      consumerCode: 'CRM_SYSTEM',
      totalRows: 1,
      filePath: 'tenant_test/job-123.csv',
      talentId: 'talent-123',
      profileStoreId: 'store-123',
      userId: 'user-123',
      defaultProfileType: 'individual',
    });
  });
});
