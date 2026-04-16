// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Real runtime smoke for customer import jobs

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue, Worker } from 'bullmq';
import request from 'supertest';
import { Readable } from 'stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '@tcrn/database';
import {
  createTestCustomerInTenant,
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { BUCKETS, MinioService } from '../../src/modules/minio';
import { ImportJobStatus } from '../../src/modules/import/dto/import.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
import { importJobProcessor } from '../../../worker/src/jobs/import.job';
import {
  createBullMqConnectionFromEnv,
  purgeWaitingImportJobsForTenantTestSchemas,
  removeImportQueueJobsByDataJobIds,
} from './queue-test-utils';

describe('Import Runtime Smoke Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let minioService: MinioService;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let talentProfileStoreId: string;
  let importQueue: Queue | null = null;
  let importWorker: Worker | null = null;

  const createdImportQueueJobIds = new Set<string>();
  const createdImportObjectNames = new Set<string>();

  const publishTalent = async (targetTalentId: string) => {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET lifecycle_status = 'published',
            published_at = COALESCE(published_at, NOW()),
            published_by = COALESCE(published_by, $2::uuid),
            updated_at = NOW(),
            updated_by = $2::uuid
        WHERE id = $1::uuid
      `,
      targetTalentId,
      testUser.id,
    );
  };

  const withAuth = (req: request.Test, includeTalentHeader = true) => {
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

    if (includeTalentHeader) {
      req.set('X-Talent-Id', talentId);
    }

    return req;
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const uniqueCode = (prefix: string) => `${prefix}_${Date.now().toString(36).toUpperCase()}`;

  const waitForImportJobSuccess = async (jobId: string) => {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
      const response = await withAuth(
        request(app.getHttpServer()).get(
          `/api/v1/talents/${talentId}/imports/customers/individual_import/${jobId}`
        ),
        false,
      ).expect(200);

      const job = response.body.data as {
        status: string;
        jobType: string;
        progress: {
          totalRows: number;
          successRows: number;
          failedRows: number;
        };
      };

      if (job.status === ImportJobStatus.SUCCESS) {
        return job;
      }

      if (job.status === ImportJobStatus.FAILED || job.status === ImportJobStatus.PARTIAL) {
        const errors = await prisma.$queryRawUnsafe<Array<{ rowNumber: number; errorMessage: string }>>(
          `
            SELECT
              row_number as "rowNumber",
              error_message as "errorMessage"
            FROM "${tenantFixture.schemaName}".import_job_error
            WHERE import_job_id = $1::uuid
            ORDER BY row_number ASC, created_at ASC
          `,
          jobId,
        );
        throw new Error(
          `Import job ${jobId} ended as ${job.status}: ${errors.map((error) => `${error.rowNumber}:${error.errorMessage}`).join('; ') || 'unknown worker failure'}`,
        );
      }

      await sleep(250);
    }

    throw new Error(`Timed out waiting for import job ${jobId} to complete`);
  };

  const uploadImportObject = async (jobId: string, csvContent: string) => {
    const objectName = `${tenantFixture.schemaName}/${jobId}.csv`;
    const contentBuffer = Buffer.from(csvContent, 'utf8');

    await minioService.uploadStream(
      BUCKETS.IMPORTS,
      objectName,
      Readable.from(contentBuffer),
      contentBuffer.byteLength,
      'text/csv',
    );

    createdImportObjectNames.add(objectName);
    return { objectName, fileSize: contentBuffer.byteLength };
  };

  const createInternalImportJob = async (fileName: string, fileSize: number, totalRows: number) => {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".import_job (
          id,
          talent_id,
          profile_store_id,
          job_type,
          status,
          file_name,
          file_size,
          total_rows,
          processed_rows,
          success_rows,
          failed_rows,
          warning_rows,
          created_by,
          created_at
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          'individual_import',
          'pending',
          $3,
          $4,
          $5,
          0,
          0,
          0,
          0,
          $6::uuid,
          NOW()
        )
        RETURNING id
      `,
      talentId,
      talentProfileStoreId,
      fileName,
      fileSize,
      totalRows,
      testUser.id,
    );

    return rows[0]!.id;
  };

  const enqueueInternalImportJob = async (
    jobId: string,
    objectName: string,
    jobType: 'customer_update' | 'membership_sync',
  ) => {
    if (!importQueue) {
      throw new Error('Import queue is not ready');
    }

    createdImportQueueJobIds.add(jobId);
    await importQueue.add('process-import', {
      jobId,
      tenantId: tenantFixture.tenant.id,
      tenantSchemaName: tenantFixture.schemaName,
      talentId,
      profileStoreId: talentProfileStoreId,
      userId: testUser.id,
      filePath: objectName,
      jobType,
      totalRows: 1,
      defaultProfileType: 'individual',
    });
  };

  const insertSocialPlatform = async (code: string) => {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".social_platform (
          id,
          code,
          name_en,
          display_name,
          is_active,
          created_at,
          updated_at,
          version
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          true,
          NOW(),
          NOW(),
          1
        )
        RETURNING id
      `,
      code,
      `${code} Platform`,
      `${code} Platform`,
    );

    return { id: rows[0]!.id, code };
  };

  const insertMembershipCatalog = async () => {
    const classCode = uniqueCode('CLASS');
    const typeCode = uniqueCode('TYPE');
    const oldLevelCode = uniqueCode('LVL_OLD');
    const newLevelCode = uniqueCode('LVL_NEW');

    const classRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".membership_class (
          id,
          owner_type,
          code,
          name_en,
          is_active,
          created_at,
          updated_at,
          version
        ) VALUES (
          gen_random_uuid(),
          'tenant',
          $1,
          $2,
          true,
          NOW(),
          NOW(),
          1
        )
        RETURNING id
      `,
      classCode,
      `${classCode} Name`,
    );
    const membershipClassId = classRows[0]!.id;

    const typeRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".membership_type (
          id,
          membership_class_id,
          code,
          name_en,
          is_active,
          created_at,
          updated_at,
          version
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2,
          $3,
          true,
          NOW(),
          NOW(),
          1
        )
        RETURNING id
      `,
      membershipClassId,
      typeCode,
      `${typeCode} Name`,
    );
    const membershipTypeId = typeRows[0]!.id;

    const oldLevelRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".membership_level (
          id,
          membership_type_id,
          code,
          name_en,
          rank,
          is_active,
          created_at,
          updated_at,
          version
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2,
          $3,
          1,
          true,
          NOW(),
          NOW(),
          1
        )
        RETURNING id
      `,
      membershipTypeId,
      oldLevelCode,
      `${oldLevelCode} Name`,
    );

    const newLevelRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".membership_level (
          id,
          membership_type_id,
          code,
          name_en,
          rank,
          is_active,
          created_at,
          updated_at,
          version
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2,
          $3,
          2,
          true,
          NOW(),
          NOW(),
          1
        )
        RETURNING id
      `,
      membershipTypeId,
      newLevelCode,
      `${newLevelCode} Name`,
    );

    return {
      classId: membershipClassId,
      typeId: membershipTypeId,
      oldLevelId: oldLevelRows[0]!.id,
      newLevelId: newLevelRows[0]!.id,
      classCode,
      typeCode,
      newLevelCode,
    };
  };

  const insertPlatformIdentity = async (customerId: string, platformId: string, platformUid: string) => {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".platform_identity (
          id,
          customer_id,
          platform_id,
          platform_uid,
          is_verified,
          is_current,
          captured_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          $3,
          false,
          true,
          NOW(),
          NOW()
        )
      `,
      customerId,
      platformId,
      platformUid,
    );
  };

  const insertMembershipRecord = async (
    customerId: string,
    platformId: string,
    membershipClassId: string,
    membershipTypeId: string,
    membershipLevelId: string,
  ) => {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantFixture.schemaName}".membership_record (
          id,
          customer_id,
          platform_id,
          membership_class_id,
          membership_type_id,
          membership_level_id,
          valid_from,
          valid_to,
          auto_renew,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          NOW(),
          NOW() + INTERVAL '7 days',
          false,
          $6::uuid,
          $6::uuid,
          NOW(),
          NOW()
        )
        RETURNING id
      `,
      customerId,
      platformId,
      membershipClassId,
      membershipTypeId,
      membershipLevelId,
      testUser.id,
    );

    return rows[0]!.id;
  };

  beforeAll(async () => {
    await purgeWaitingImportJobsForTenantTestSchemas();

    importQueue = new Queue('import', {
      connection: createBullMqConnectionFromEnv(),
    });
    await importQueue.waitUntilReady();

    importWorker = new Worker('import', importJobProcessor, {
      connection: createBullMqConnectionFromEnv(),
      concurrency: 1,
    });
    await importWorker.waitUntilReady();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    minioService = moduleFixture.get(MinioService);
    tenantFixture = await createTestTenantFixture(prisma, 'import_runtime');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `import_runtime_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: uniqueCode('SUB_IMRT'),
      nameEn: 'Import Runtime Smoke Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: uniqueCode('TAL_IMRT'),
      nameEn: 'Import Runtime Smoke Talent',
      displayName: 'Import Runtime Smoke Talent',
      homepagePath: `import-runtime-${Date.now()}`,
      createdBy: testUser.id,
    });

    talentId = talent.id;
    await publishTalent(talentId);

    const talentRows = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string }>>(
      `
        SELECT profile_store_id as "profileStoreId"
        FROM "${tenantFixture.schemaName}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );
    talentProfileStoreId = talentRows[0]!.profileStoreId;

    const tokenService = moduleFixture.get(TokenService);
    accessToken = tokenService.generateAccessToken({
      sub: testUser.id,
      tid: testUser.tenantId,
      tsc: testUser.schemaName,
      email: testUser.email,
      username: testUser.username,
    }).token;
  });

  afterAll(async () => {
    if (importWorker) {
      await importWorker.close();
    }
    if (importQueue) {
      await importQueue.close();
    }

    await removeImportQueueJobsByDataJobIds(createdImportQueueJobIds);
    for (const objectName of createdImportObjectNames) {
      try {
        await minioService.deleteFile(BUCKETS.IMPORTS, objectName);
      } catch {
        // Ignore cleanup drift for already-deleted test objects.
      }
    }
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('processes public individual import upload through API, Redis worker, and tenant DB end-to-end', async () => {
    const csvContent = [
      'external_id,nickname,primary_language,status_code,tags,notes',
      ',Runtime Import Customer,zh,,vip,runtime create smoke',
    ].join('\n');

    const createResponse = await withAuth(
      request(app.getHttpServer()).post(
        `/api/v1/talents/${talentId}/imports/customers/individuals`
      ),
      false,
    )
      .attach('file', Buffer.from(csvContent, 'utf8'), 'runtime_individual_import.csv')
      .expect(201);

    const importJobId = createResponse.body.data.id as string;
    createdImportQueueJobIds.add(importJobId);
    createdImportObjectNames.add(`${tenantFixture.schemaName}/${importJobId}.csv`);

    const completedJob = await waitForImportJobSuccess(importJobId);

    expect(completedJob.status).toBe(ImportJobStatus.SUCCESS);
    expect(completedJob.jobType).toBe('individual_import');
    expect(completedJob.progress).toMatchObject({
      totalRows: 1,
      successRows: 1,
      failedRows: 0,
    });

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        nickname: string;
        primaryLanguage: string | null;
        tags: string[];
        notes: string | null;
        profileStoreId: string;
      }>
    >(
      `
        SELECT
          nickname,
          primary_language as "primaryLanguage",
          tags,
          notes,
          profile_store_id as "profileStoreId"
        FROM "${tenantFixture.schemaName}".customer_profile
        WHERE talent_id = $1::uuid
          AND nickname = 'Runtime Import Customer'
      `,
      talentId,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nickname: 'Runtime Import Customer',
      primaryLanguage: 'zh',
      tags: ['vip'],
      notes: 'runtime create smoke',
      profileStoreId: talentProfileStoreId,
    });
  });

  it('processes internal customer_update jobs through Redis worker and updates the tenant customer row', async () => {
    const customer = await createTestCustomerInTenant(prisma, tenantFixture, {
      nickname: 'Customer Update Before',
      talentId,
      profileStoreId: talentProfileStoreId,
      createdBy: testUser.id,
    });
    const platform = await insertSocialPlatform(uniqueCode('UPD'));
    const platformUid = uniqueCode('UID');

    await insertPlatformIdentity(customer.id, platform.id, platformUid);

    const csvContent = [
      'platform_code,platform_uid,nickname,tags,notes',
      `${platform.code},${platformUid},Customer Update After,vip,updated through runtime smoke`,
    ].join('\n');
    const jobId = await createInternalImportJob('customer_update_runtime.csv', Buffer.byteLength(csvContent, 'utf8'), 1);
    const { objectName } = await uploadImportObject(jobId, csvContent);

    await enqueueInternalImportJob(jobId, objectName, 'customer_update');

    const completedJob = await waitForImportJobSuccess(jobId);

    expect(completedJob.status).toBe(ImportJobStatus.SUCCESS);
    expect(completedJob.progress.successRows).toBe(1);

    const rows = await prisma.$queryRawUnsafe<Array<{ nickname: string; tags: string[]; notes: string | null }>>(
      `
        SELECT nickname, tags, notes
        FROM "${tenantFixture.schemaName}".customer_profile
        WHERE id = $1::uuid
      `,
      customer.id,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nickname: 'Customer Update After',
      tags: ['vip'],
      notes: 'updated through runtime smoke',
    });
  });

  it('processes internal membership_sync jobs through Redis worker and updates the tenant membership row', async () => {
    const customer = await createTestCustomerInTenant(prisma, tenantFixture, {
      nickname: 'Membership Sync Customer',
      talentId,
      profileStoreId: talentProfileStoreId,
      createdBy: testUser.id,
    });
    const platform = await insertSocialPlatform(uniqueCode('MBR'));
    const platformUid = uniqueCode('UID');
    const catalog = await insertMembershipCatalog();

    await insertPlatformIdentity(customer.id, platform.id, platformUid);
    const membershipRecordId = await insertMembershipRecord(
      customer.id,
      platform.id,
      catalog.classId,
      catalog.typeId,
      catalog.oldLevelId,
    );

    const csvContent = [
      'platform_code,platform_uid,nickname,membership_class_code,membership_type_code,membership_level_code,valid_to',
      `${platform.code},${platformUid},Membership Sync Customer,${catalog.classCode},${catalog.typeCode},${catalog.newLevelCode},2026-12-31`,
    ].join('\n');
    const jobId = await createInternalImportJob('membership_sync_runtime.csv', Buffer.byteLength(csvContent, 'utf8'), 1);
    const { objectName } = await uploadImportObject(jobId, csvContent);

    await enqueueInternalImportJob(jobId, objectName, 'membership_sync');

    const completedJob = await waitForImportJobSuccess(jobId);

    expect(completedJob.status).toBe(ImportJobStatus.SUCCESS);
    expect(completedJob.progress.successRows).toBe(1);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        membershipLevelId: string;
        validTo: Date | null;
        externalSyncedAt: Date | null;
      }>
    >(
      `
        SELECT
          membership_level_id as "membershipLevelId",
          valid_to as "validTo",
          external_synced_at as "externalSyncedAt"
        FROM "${tenantFixture.schemaName}".membership_record
        WHERE id = $1::uuid
      `,
      membershipRecordId,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].membershipLevelId).toBe(catalog.newLevelId);
    expect(rows[0].validTo?.toISOString()).toContain('2026-12-31');
    expect(rows[0].externalSyncedAt).toBeInstanceOf(Date);
  });
});
