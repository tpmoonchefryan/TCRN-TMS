// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type MarshmallowExportJobData,
  marshmallowExportJobProcessor,
  type MarshmallowExportJobResult,
} from '../marshmallow-export.job';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $disconnect: vi.fn(),
};

const mockMinioClient = {
  bucketExists: vi.fn(),
  makeBucket: vi.fn(),
  putObject: vi.fn(),
};

const mockFs = vi.hoisted(() => ({
  writeFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 128 })),
  createReadStream: vi.fn(() => ({ stream: true })),
  existsSync: vi.fn(() => true),
  unlinkSync: vi.fn(),
}));

vi.mock('@tcrn/database', () => ({
  PrismaClient: class MockPrismaClient {
    $queryRawUnsafe = mockPrisma.$queryRawUnsafe;
    $executeRawUnsafe = mockPrisma.$executeRawUnsafe;
    $disconnect = mockPrisma.$disconnect;
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    writeFileSync: mockFs.writeFileSync,
    statSync: mockFs.statSync,
    createReadStream: mockFs.createReadStream,
    existsSync: mockFs.existsSync,
    unlinkSync: mockFs.unlinkSync,
  };
});

vi.mock('minio', () => ({
  Client: class MockMinioClient {
    bucketExists = mockMinioClient.bucketExists;
    makeBucket = mockMinioClient.makeBucket;
    putObject = mockMinioClient.putObject;
  },
}));

describe('marshmallowExportJobProcessor', () => {
  let mockJob: Job<MarshmallowExportJobData, MarshmallowExportJobResult>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockJob = {
      data: {
        jobId: 'export-job-1',
        talentId: 'talent-1',
        tenantSchema: 'tenant_test',
        format: 'csv',
        filters: {
          includeRejected: false,
        },
      },
    } as Job<MarshmallowExportJobData, MarshmallowExportJobResult>;

    mockPrisma.$queryRawUnsafe.mockImplementation(async (query: string) => {
      if (query.includes('FROM public.tenant')) {
        return [{ id: 'tenant-1', schemaName: 'tenant_test', isActive: true }];
      }

      if (query.includes('COUNT(*)')) {
        return [{ count: 1 }];
      }

      return [
        {
          id: 'message-1',
          content: 'Hello "world"',
          senderName: 'Test Sender',
          isAnonymous: false,
          status: 'approved',
          replyContent: 'Reply content',
          createdAt: new Date('2026-03-26T00:00:00.000Z'),
          moderatedAt: new Date('2026-03-26T01:00:00.000Z'),
          reactionCounts: { heart: 3 },
        },
      ];
    });
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
    mockMinioClient.bucketExists.mockResolvedValue(true);
    mockMinioClient.makeBucket.mockResolvedValue(undefined);
    mockMinioClient.putObject.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uploads the generated file to MinIO and stores the object path without bucket prefix', async () => {
    const result = await marshmallowExportJobProcessor(mockJob);

    expect(result.rowCount).toBe(1);
    expect(result.filePath).toContain('tenant_test/export-job-1/marshmallow_export_');
    expect(result.fileName).toMatch(/^marshmallow_export_/);

    expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      'temp-reports',
      expect.stringMatching(/^tenant_test\/export-job-1\/marshmallow_export_.+\.csv$/),
      { stream: true },
      128,
      { 'Content-Type': 'text/csv' }
    );

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(
      mockPrisma.$executeRawUnsafe.mock.calls.every((call) => {
        const sql = call[0];
        return typeof sql === 'string' && sql.includes('marshmallow_export_job');
      })
    ).toBe(true);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('file_path = $1');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[1]).toMatch(
      /^tenant_test\/export-job-1\/marshmallow_export_.+\.csv$/
    );
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[1]).not.toContain('temp-reports/');
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy export_job rows when the dedicated table does not contain the job', async () => {
    mockPrisma.$executeRawUnsafe
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await marshmallowExportJobProcessor(mockJob);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(4);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('marshmallow_export_job');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('export_job');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('job_type = $3');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[2]?.[0]).toContain('marshmallow_export_job');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[3]?.[0]).toContain('export_job');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[3]?.[0]).toContain('job_type = $6');
  });

  it('rejects a poisoned tenant schema before SQL or MinIO IO', async () => {
    mockJob.data.tenantSchema = 'tenant_bad";DROP';

    await expect(marshmallowExportJobProcessor(mockJob)).rejects.toThrow(
      'Worker job tenant schema is invalid'
    );

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(mockMinioClient.putObject).not.toHaveBeenCalled();
  });

  it('neutralizes spreadsheet formula prefixes in marshmallow CSV exports', async () => {
    mockJob.data.format = 'csv';
    mockPrisma.$queryRawUnsafe.mockImplementation(async (query: string) => {
      if (query.includes('FROM public.tenant')) {
        return [{ id: 'tenant-1', schemaName: 'tenant_test', isActive: true }];
      }

      if (query.includes('COUNT(*)')) {
        return [{ count: 1 }];
      }

      return [
        {
          id: 'message-1',
          content: '=cmd',
          senderName: '+sender',
          isAnonymous: false,
          status: '-approved',
          replyContent: '@reply',
          createdAt: new Date('2026-03-26T00:00:00.000Z'),
          moderatedAt: new Date('2026-03-26T01:00:00.000Z'),
          reactionCounts: { heart: 3 },
        },
      ];
    });

    await marshmallowExportJobProcessor(mockJob);

    const csvContent = String(mockFs.writeFileSync.mock.calls[0]?.[1]);
    expect(csvContent).toContain("message-1,'=cmd,'+sender");
    expect(csvContent).toContain("'-approved,'@reply");
  });

  it('creates the temp-reports bucket before upload when it does not exist', async () => {
    mockMinioClient.bucketExists.mockResolvedValue(false);

    await marshmallowExportJobProcessor(mockJob);

    expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('temp-reports', 'us-east-1');
    expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
  });
});
