// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reportJobProcessor, type ReportJobData, type ReportJobResult } from '../report.job';

const mockPrisma = {
  membershipRecord: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  profileStore: {
    findUnique: vi.fn(),
  },
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
  appendFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 256 })),
  createReadStream: vi.fn(() => ({ stream: true })),
  existsSync: vi.fn(() => true),
  unlinkSync: vi.fn(),
}));

const mockExcel = vi.hoisted(() => {
  const headerRow = { font: {}, fill: {} };
  const worksheet = {
    columns: [] as unknown[],
    getRow: vi.fn(() => headerRow),
    addRow: vi.fn(() => ({ commit: vi.fn() })),
  };
  const workbook = {
    addWorksheet: vi.fn(() => worksheet),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    worksheet,
    workbook,
  };
});

vi.mock('@tcrn/database', () => ({
  Prisma: {},
  PrismaClient: class MockPrismaClient {
    membershipRecord = mockPrisma.membershipRecord;
    profileStore = mockPrisma.profileStore;
    $executeRawUnsafe = mockPrisma.$executeRawUnsafe;
    $disconnect = mockPrisma.$disconnect;
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    writeFileSync: mockFs.writeFileSync,
    appendFileSync: mockFs.appendFileSync,
    statSync: mockFs.statSync,
    createReadStream: mockFs.createReadStream,
    existsSync: mockFs.existsSync,
    unlinkSync: mockFs.unlinkSync,
  };
});

vi.mock('exceljs', () => ({
  default: {
    stream: {
      xlsx: {
        WorkbookWriter: class MockWorkbookWriter {
          addWorksheet = mockExcel.workbook.addWorksheet;
          commit = mockExcel.workbook.commit;
        },
      },
    },
  },
}));

vi.mock('minio', () => ({
  Client: class MockMinioClient {
    bucketExists = mockMinioClient.bucketExists;
    makeBucket = mockMinioClient.makeBucket;
    putObject = mockMinioClient.putObject;
  },
}));

describe('reportJobProcessor', () => {
  let mockJob: Job<ReportJobData, ReportJobResult>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockJob = {
      data: {
        jobId: 'report-job-1',
        reportType: 'mfr',
        tenantId: 'tenant-1',
        tenantSchemaName: 'tenant_test',
        userId: 'user-1',
        filters: {},
        options: {
          language: 'en',
          includePii: false,
        },
      },
      updateProgress: vi.fn(),
    } as unknown as Job<ReportJobData, ReportJobResult>;

    mockPrisma.membershipRecord.count.mockResolvedValue(1);
    mockPrisma.membershipRecord.findMany.mockResolvedValue([
      {
        customer: {
          nickname: 'Customer A',
          profileType: 'individual',
          rmProfileId: null,
          status: { nameEn: 'Active' },
          tags: ['vip'],
          source: 'manual',
        },
        platform: { nameEn: 'YouTube' },
        membershipClass: { nameEn: 'Gold' },
        membershipType: { nameEn: 'Member' },
        membershipLevel: { nameEn: 'Level 1' },
        validFrom: new Date('2026-03-26T00:00:00.000Z'),
        validTo: new Date('2026-03-27T00:00:00.000Z'),
        autoRenew: true,
        isExpired: false,
        createdAt: new Date('2026-03-26T00:00:00.000Z'),
      },
    ]);
    mockPrisma.profileStore.findUnique.mockResolvedValue(null);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
    mockMinioClient.bucketExists.mockResolvedValue(true);
    mockMinioClient.makeBucket.mockResolvedValue(undefined);
    mockMinioClient.putObject.mockResolvedValue(undefined);
  });

  it('uploads the report artifact, cleans up the temp file, and keeps updated_at in progress/status writes', async () => {
    const result = await reportJobProcessor(mockJob);

    expect(result.filePath).toMatch(/^tenant_test\/report-job-1\/MFR_tenant-1_.+\.xlsx$/);
    expect(result.fileName).toMatch(/^MFR_tenant-1_.+\.xlsx$/);
    expect(result.rowCount).toBe(1);
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);

    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      'temp-reports',
      expect.stringMatching(/^tenant_test\/report-job-1\/MFR_tenant-1_.+\.xlsx$/),
      { stream: true },
      256,
      { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('updated_at = NOW()');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('updated_at = NOW()');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[2]?.[0]).toContain('updated_at = NOW()');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('/mfr_report-job-1.xlsx'),
    );
  });

  it('honors csv format at runtime instead of always emitting xlsx', async () => {
    mockJob.data.format = 'csv';

    const result = await reportJobProcessor(mockJob);

    expect(result.filePath).toMatch(/^tenant_test\/report-job-1\/MFR_tenant-1_.+\.csv$/);
    expect(result.fileName).toMatch(/^MFR_tenant-1_.+\.csv$/);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/mfr_report-job-1.csv'),
      expect.stringContaining('Nickname,Type,Platform'),
      'utf8',
    );
    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/mfr_report-job-1.csv'),
      expect.stringContaining('Customer A,individual,YouTube'),
      'utf8',
    );
    expect(mockExcel.workbook.addWorksheet).not.toHaveBeenCalled();
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      'temp-reports',
      expect.stringMatching(/^tenant_test\/report-job-1\/MFR_tenant-1_.+\.csv$/),
      { stream: true },
      256,
      { 'Content-Type': 'text/csv' },
    );
  });

  it('cleans up the temp file and marks the job failed when MinIO upload throws', async () => {
    mockMinioClient.putObject.mockRejectedValueOnce(new Error('upload failed'));

    await expect(reportJobProcessor(mockJob)).rejects.toThrow('upload failed');

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[2]?.[0]).toContain('updated_at = NOW()');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[2]?.[0]).toContain('error_message = $3');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('/mfr_report-job-1.xlsx'),
    );
  });
});
