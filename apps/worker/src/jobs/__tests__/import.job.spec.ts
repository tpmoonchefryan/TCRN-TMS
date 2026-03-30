// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ImportJobData, importJobProcessor, type ImportJobResult } from '../import.job';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $disconnect: vi.fn(),
};

const mockMinioClient = {
  getObject: vi.fn(),
};

vi.mock('@tcrn/database', () => ({
  PrismaClient: class MockPrismaClient {
    $queryRawUnsafe = mockPrisma.$queryRawUnsafe;
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
  let platformRows: Array<{ id: string; code: string }>;
  let membershipClassRows: Array<{ id: string; code: string }>;
  let membershipTypeRows: Array<{ id: string; code: string; membershipClassId: string }>;
  let membershipLevelRows: Array<{ id: string; code: string; membershipTypeId: string }>;
  let customerStatusRows: Array<{ id: string; code: string }>;
  let businessSegmentRows: Array<{ id: string; code: string }>;
  let consumerRows: Array<{ id: string; code: string }>;
  let customerIdentityRows: Array<{
    customerId: string;
    nickname?: string;
    tags?: string[];
    notes?: string | null;
  }>;
  let membershipRecordRows: Array<{ id: string }>;

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

    platformRows = [{ id: 'platform-1', code: 'BILIBILI' }];
    membershipClassRows = [];
    membershipTypeRows = [];
    membershipLevelRows = [];
    customerStatusRows = [];
    businessSegmentRows = [];
    consumerRows = [];
    customerIdentityRows = [];
    membershipRecordRows = [];

    mockPrisma.$queryRawUnsafe.mockImplementation(async (query: string) => {
      if (query.includes('"tenant_test"."social_platform"')) {
        return platformRows;
      }
      if (query.includes('"tenant_test"."membership_class"')) {
        return membershipClassRows;
      }
      if (query.includes('"tenant_test"."membership_type"')) {
        return membershipTypeRows;
      }
      if (query.includes('"tenant_test"."membership_level"')) {
        return membershipLevelRows;
      }
      if (query.includes('"tenant_test"."customer_status"')) {
        return customerStatusRows;
      }
      if (query.includes('"tenant_test"."business_segment"')) {
        return businessSegmentRows;
      }
      if (query.includes('"tenant_test"."consumer"')) {
        return consumerRows;
      }
      if (
        query.includes('FROM "tenant_test"."platform_identity" pi') &&
        query.includes('JOIN "tenant_test"."customer_profile"')
      ) {
        return customerIdentityRows;
      }
      if (query.includes('FROM "tenant_test"."membership_record"')) {
        return membershipRecordRows;
      }

      return [];
    });
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
    mockMinioClient.getObject.mockResolvedValue(
      Readable.from([
        'nickname,primary_language,status_code,tags,notes\n',
        'Imported User,en,,vip,created from template\n',
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
    businessSegmentRows = [{ id: 'segment-1', code: 'SEG_A' }];

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
    });
    const customerProfileInsert = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO "tenant_test"."customer_profile"'),
    );
    const companyInfoInsert = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO "tenant_test"."customer_company_info"'),
    );

    expect(customerProfileInsert?.[6]).toBe('company');
    expect(customerProfileInsert?.[7]).toBe('ACME');
    expect(companyInfoInsert?.[2]).toBe('ACME Corporation');
    expect(companyInfoInsert?.[7]).toBe('segment-1');
  });

  it('maps the current public individual import template fields into persisted customer data', async () => {
    mockJob.data.options = {
      validateOnly: false,
    };
    mockJob.data.consumerCode = 'CRM_SYSTEM';
    mockMinioClient.getObject.mockResolvedValueOnce(
      Readable.from([
        'external_id,nickname,primary_language,status_code,tags,notes\n',
        'EXT001,Template User,zh,ACTIVE,tag-a,notes here\n',
      ]),
    );
    customerStatusRows = [{ id: 'status-1', code: 'ACTIVE' }];
    consumerRows = [{ id: 'consumer-1', code: 'CRM_SYSTEM' }];

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
    });
    const customerProfileInsert = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO "tenant_test"."customer_profile"'),
    );
    const externalIdInsert = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO "tenant_test"."customer_external_id"'),
    );

    expect(customerProfileInsert?.[6]).toBe('individual');
    expect(customerProfileInsert?.[7]).toBe('Template User');
    expect(customerProfileInsert?.[8]).toBe('zh');
    expect(customerProfileInsert?.[9]).toBe('status-1');
    expect(customerProfileInsert?.[10]).toEqual(['tag-a']);
    expect(customerProfileInsert?.[12]).toBe('notes here');
    expect(externalIdInsert?.[2]).toBe('profile-store-1');
    expect(externalIdInsert?.[3]).toBe('consumer-1');
    expect(externalIdInsert?.[4]).toBe('EXT001');
    expect(externalIdInsert?.[5]).toBe('user-1');
  });

  it('updates an existing customer when processing customer_update jobs', async () => {
    mockJob.data.jobType = 'customer_update';
    mockJob.data.options = {
      validateOnly: false,
    };
    mockMinioClient.getObject.mockResolvedValueOnce(
      Readable.from([
        'platform_code,platform_uid,nickname,tags,notes\n',
        'BILIBILI,uid-123,Updated User,vip,updated from sync\n',
      ]),
    );
    customerIdentityRows = [{
      customerId: 'customer-1',
      nickname: 'Old User',
      tags: ['old'],
      notes: 'old notes',
    }];

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      skippedRows: 0,
      failedRows: 0,
    });
    const customerProfileUpdate = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE "tenant_test"."customer_profile"'),
    );

    expect(customerProfileUpdate).toEqual(
      expect.arrayContaining([
        expect.stringContaining('UPDATE "tenant_test"."customer_profile"'),
        'Updated User',
        ['vip'],
        'updated from sync',
        'user-1',
        'customer-1',
      ]),
    );
  });

  it('marks missing customer_update targets as skipped instead of failed', async () => {
    mockJob.data.jobType = 'customer_update';
    mockJob.data.options = {
      validateOnly: false,
    };
    mockMinioClient.getObject.mockResolvedValueOnce(
      Readable.from([
        'platform_code,platform_uid,nickname\n',
        'BILIBILI,missing-user,Updated User\n',
      ]),
    );
    customerIdentityRows = [];

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 0,
      skippedRows: 1,
      failedRows: 0,
    });
    expect(result.warnings).toContainEqual({
      row: 2,
      message: 'Customer not found for update',
    });
    expect(
      mockPrisma.$executeRawUnsafe.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes('UPDATE "tenant_test"."customer_profile"'),
      ),
    ).toBe(false);
  });

  it('updates existing membership records during membership_sync jobs', async () => {
    mockJob.data.jobType = 'membership_sync';
    mockJob.data.options = {
      validateOnly: false,
    };
    mockMinioClient.getObject.mockResolvedValueOnce(
      Readable.from([
        'platform_code,platform_uid,nickname,membership_class_code,membership_type_code,membership_level_code,valid_to\n',
        'BILIBILI,uid-123,Member User,FAN,MONTHLY,GOLD,2026-12-31\n',
      ]),
    );
    membershipClassRows = [{ id: 'class-1', code: 'FAN' }];
    membershipTypeRows = [
      { id: 'type-1', code: 'MONTHLY', membershipClassId: 'class-1' },
    ];
    membershipLevelRows = [
      { id: 'level-1', code: 'GOLD', membershipTypeId: 'type-1' },
    ];
    customerIdentityRows = [{
      customerId: 'customer-1',
    }];
    membershipRecordRows = [{
      id: 'membership-1',
    }];

    const result = await importJobProcessor(mockJob);

    expect(result).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
    });
    const membershipRecordUpdate = mockPrisma.$executeRawUnsafe.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE "tenant_test"."membership_record"'),
    );

    expect(membershipRecordUpdate?.[1]).toBe('level-1');
    expect(membershipRecordUpdate?.[2]).toEqual(new Date('2026-12-31'));
    expect(membershipRecordUpdate?.[3]).toEqual(expect.any(Date));
    expect(membershipRecordUpdate?.[4]).toBe('membership-1');
    expect(
      mockPrisma.$executeRawUnsafe.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes('INSERT INTO "tenant_test"."membership_record"'),
      ),
    ).toBe(false);
  });
});
