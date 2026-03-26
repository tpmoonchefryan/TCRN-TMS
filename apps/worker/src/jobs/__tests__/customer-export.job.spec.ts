// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CustomerExportJobData,
  customerExportJobProcessor,
  type CustomerExportJobResult,
} from '../customer-export.job';

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
  createReadStream: vi.fn(() => ({})),
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
    createReadStream: mockFs.createReadStream,
  };
});

vi.mock('minio', () => ({
  Client: class MockMinioClient {
    bucketExists = mockMinioClient.bucketExists;
    makeBucket = mockMinioClient.makeBucket;
    putObject = mockMinioClient.putObject;
  },
}));

describe('customerExportJobProcessor', () => {
  let mockJob: Job<CustomerExportJobData, CustomerExportJobResult>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockJob = {
      data: {
        jobId: 'export-job-1',
        jobType: 'customer_export',
        talentId: 'talent-1',
        profileStoreId: 'profile-store-1',
        tenantSchema: 'tenant_test',
        format: 'csv',
        filters: {},
      },
      updateProgress: vi.fn(),
    } as unknown as Job<CustomerExportJobData, CustomerExportJobResult>;

    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'customer-1',
        nickname: 'Test Customer',
        profileType: 'individual',
        primaryLanguage: 'en',
        tags: ['vip'],
        isActive: true,
        source: 'manual',
        createdAt: new Date('2026-03-26T00:00:00.000Z'),
        updatedAt: new Date('2026-03-26T00:00:00.000Z'),
        statusCode: 'active',
        statusName: 'Active',
        companyShortName: null,
        originTalentDisplayName: 'Talent A',
        membershipPlatformCode: 'yt',
        membershipPlatformName: 'YouTube',
        membershipClassCode: 'gold',
        membershipClassName: 'Gold',
        membershipLevelCode: 'lv1',
        membershipLevelName: 'Level 1',
        membershipCount: 1,
      },
    ]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
    mockMinioClient.bucketExists.mockResolvedValue(true);
    mockMinioClient.makeBucket.mockResolvedValue(undefined);
    mockMinioClient.putObject.mockResolvedValue(undefined);
  });

  it('writes the export artifact, uploads it, and marks the job successful', async () => {
    const result = await customerExportJobProcessor(mockJob);

    expect(result.rowCount).toBe(1);
    expect(result.filePath).toContain('tenant_test/export-job-1/customer_export_');
    expect(result.fileName).toMatch(/^customer_export_/);
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(3);
    expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
  });

  it('fails fast when includePii is requested for generic customer export', async () => {
    mockJob.data.filters.includePii = true;

    await expect(customerExportJobProcessor(mockJob)).rejects.toThrow(
      'Customer export does not support includePii yet',
    );

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(mockMinioClient.putObject).not.toHaveBeenCalled();
  });
});
