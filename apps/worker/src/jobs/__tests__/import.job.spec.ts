// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { importJobProcessor, type ImportJobData, type ImportJobResult } from '../import.job';

const mockPrisma = {
  socialPlatform: {
    findMany: vi.fn(),
  },
  membershipClass: {
    findMany: vi.fn(),
  },
  membershipType: {
    findMany: vi.fn(),
  },
  membershipLevel: {
    findMany: vi.fn(),
  },
  customerStatus: {
    findMany: vi.fn(),
  },
  businessSegment: {
    findMany: vi.fn(),
  },
  customerProfile: {
    create: vi.fn(),
  },
  customerCompanyInfo: {
    create: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
  $disconnect: vi.fn(),
};

const mockMinioClient = {
  getObject: vi.fn(),
};

vi.mock('@tcrn/database', () => ({
  PrismaClient: class MockPrismaClient {
    socialPlatform = mockPrisma.socialPlatform;
    membershipClass = mockPrisma.membershipClass;
    membershipType = mockPrisma.membershipType;
    membershipLevel = mockPrisma.membershipLevel;
    customerStatus = mockPrisma.customerStatus;
    businessSegment = mockPrisma.businessSegment;
    customerProfile = mockPrisma.customerProfile;
    customerCompanyInfo = mockPrisma.customerCompanyInfo;
    $executeRawUnsafe = mockPrisma.$executeRawUnsafe;
    $disconnect = mockPrisma.$disconnect;
  },
}));

vi.mock('minio', () => ({
  Client: class MockMinioClient {
    getObject = mockMinioClient.getObject;
  },
}));

describe('importJobProcessor', () => {
  let mockJob: Job<ImportJobData, ImportJobResult>;
  let tempFilePath: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockJob = {
      data: {
        jobId: 'import-job-1',
        tenantId: 'tenant-1',
        tenantSchemaName: 'tenant_test',
        talentId: 'talent-1',
        profileStoreId: 'profile-store-1',
        userId: 'user-1',
        filePath: 'tenant_test/import-job-1.csv',
        jobType: 'customer_create',
        totalRows: 1,
        defaultProfileType: 'individual',
        options: {
          validateOnly: true,
        },
      },
      updateProgress: vi.fn(),
    } as unknown as Job<ImportJobData, ImportJobResult>;

    tempFilePath = path.join(os.tmpdir(), `import_${mockJob.data.jobId}.csv`);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    mockPrisma.socialPlatform.findMany.mockResolvedValue([{ id: 'platform-1', code: 'BILIBILI' }]);
    mockPrisma.membershipClass.findMany.mockResolvedValue([]);
    mockPrisma.membershipType.findMany.mockResolvedValue([]);
    mockPrisma.membershipLevel.findMany.mockResolvedValue([]);
    mockPrisma.customerStatus.findMany.mockResolvedValue([]);
    mockPrisma.businessSegment.findMany.mockResolvedValue([]);
    mockPrisma.customerProfile.create.mockResolvedValue(undefined);
    mockPrisma.customerCompanyInfo.create.mockResolvedValue(undefined);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
    mockMinioClient.getObject.mockResolvedValue(
      Readable.from([
        'nickname,profile_type,platform_code,platform_uid\n',
        'Imported User,individual,BILIBILI,12345\n',
      ]),
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  it('downloads the import csv from MinIO and writes completion state using current import_job columns', async () => {
    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
      warningRows: 0,
    });
    expect(mockMinioClient.getObject).toHaveBeenCalledWith(
      'imports',
      'tenant_test/import-job-1.csv',
    );
    expect(fs.existsSync(tempFilePath)).toBe(false);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[0]?.[0]).toContain("SET status = $1, started_at = $2");
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('success_rows = $5');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('failed_rows = $6');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[0]).toContain('warning_rows = $7');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1]?.[1]).toBe('success');
  });

  it('uses defaultProfileType=company to create company customers instead of silently defaulting to individual', async () => {
    mockJob.data.defaultProfileType = 'company';
    mockJob.data.options = {
      validateOnly: false,
    };
    mockJob.data.filePath = 'tenant_test/import-job-company.csv';
    mockMinioClient.getObject.mockResolvedValueOnce(
      Readable.from([
        'nickname,company_legal_name,business_segment_code\n',
        'ACME,ACME Corporation,SEG_A\n',
      ]),
    );
    mockPrisma.businessSegment.findMany.mockResolvedValue([{ id: 'segment-1', code: 'SEG_A' }]);

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
    });
    expect(mockPrisma.customerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profileType: 'company',
          nickname: 'ACME',
        }),
      }),
    );
    expect(mockPrisma.customerCompanyInfo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyLegalName: 'ACME Corporation',
          businessSegmentId: 'segment-1',
        }),
      }),
    );
  });
});
