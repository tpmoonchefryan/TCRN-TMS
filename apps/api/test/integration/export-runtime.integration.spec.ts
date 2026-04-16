// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Real runtime smoke for generic customer export

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Worker } from 'bullmq';
import { Client } from 'minio';
import request from 'supertest';
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
import {
  ExportFormat,
  ExportJobStatus,
  ExportJobType,
} from '../../src/modules/export/dto/export.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
import { exportJobProcessor } from '../../../worker/src/jobs/export.job';
import {
  createBullMqConnectionFromEnv,
  purgeWaitingExportJobsForTenantTestSchemas,
  removeExportQueueJobsByDataJobIds,
} from './queue-test-utils';

describe('Export Runtime Smoke Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let exportWorker: Worker | null = null;
  let exportJobId: string | undefined;

  const createdExportQueueJobIds = new Set<string>();

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

  const waitForExportJobSuccess = async (jobId: string) => {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
      const response = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/exports/${jobId}`),
        false,
      ).expect(200);

      const job = response.body.data as {
        status: string;
        fileName: string | null;
        downloadUrl: string | null;
      };

      if (job.status === ExportJobStatus.SUCCESS) {
        return job;
      }

      if (job.status === ExportJobStatus.FAILED) {
        const rows = await prisma.$queryRawUnsafe<Array<{ errorMessage: string | null }>>(
          `
            SELECT error_message as "errorMessage"
            FROM "${tenantFixture.schemaName}".export_job
            WHERE id = $1::uuid
          `,
          jobId,
        );
        throw new Error(
          `Export job ${jobId} failed: ${rows[0]?.errorMessage ?? 'unknown worker failure'}`,
        );
      }

      await sleep(250);
    }

    throw new Error(`Timed out waiting for export job ${jobId} to complete`);
  };

  const createMinioClient = () => {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
    const [endpointHost, endpointPort] = endpoint.split(':');

    return new Client({
      endPoint: endpointHost,
      port: parseInt(endpointPort || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD || '',
    });
  };

  beforeAll(async () => {
    await purgeWaitingExportJobsForTenantTestSchemas();

    exportWorker = new Worker('export', exportJobProcessor, {
      connection: createBullMqConnectionFromEnv(),
      concurrency: 1,
    });
    await exportWorker.waitUntilReady();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'export_runtime');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `export_runtime_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_EXRT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Export Runtime Smoke Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_EXRT_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Export Runtime Smoke Talent',
      displayName: 'Export Runtime Smoke Talent',
      homepagePath: `export-runtime-${Date.now()}`,
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
    const talentProfileStoreId = talentRows[0]?.profileStoreId;

    if (!talentProfileStoreId) {
      throw new Error(`No profile store found for smoke talent ${talentId}`);
    }

    await createTestCustomerInTenant(prisma, tenantFixture, {
      nickname: 'Runtime Smoke Customer',
      talentId,
      profileStoreId: talentProfileStoreId,
      createdBy: testUser.id,
    });

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
    if (exportWorker) {
      await exportWorker.close();
    }

    await removeExportQueueJobsByDataJobIds(createdExportQueueJobIds);
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('processes customer_export through Redis worker and MinIO end-to-end', async () => {
    const createResponse = await withAuth(
      request(app.getHttpServer()).post('/api/v1/exports'),
    )
      .send({
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
      })
      .expect(201);

    exportJobId = createResponse.body.data.id;
    createdExportQueueJobIds.add(exportJobId);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe(ExportJobStatus.PENDING);
    expect(createResponse.body.data.jobType).toBe(ExportJobType.CUSTOMER_EXPORT);

    const completedJob = await waitForExportJobSuccess(exportJobId);

    expect(completedJob.status).toBe(ExportJobStatus.SUCCESS);
    expect(completedJob.fileName).toMatch(/^customer_export_/);
    expect(completedJob.downloadUrl).toBe(`/api/v1/exports/${exportJobId}/download`);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        status: string;
        filePath: string | null;
        fileName: string | null;
        totalRecords: number;
        processedRecords: number;
      }>
    >(
      `
        SELECT
          status,
          file_path as "filePath",
          file_name as "fileName",
          total_records as "totalRecords",
          processed_records as "processedRecords"
        FROM "${tenantFixture.schemaName}".export_job
        WHERE id = $1::uuid
      `,
      exportJobId,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: ExportJobStatus.SUCCESS,
      fileName: completedJob.fileName,
      totalRecords: 1,
      processedRecords: 1,
    });
    expect(rows[0].filePath).toContain(`${tenantFixture.schemaName}/${exportJobId}/customer_export_`);

    const minioClient = createMinioClient();
    const objectStats = await minioClient.statObject('temp-reports', rows[0].filePath!);

    expect(objectStats.size).toBeGreaterThan(0);

    const downloadResponse = await withAuth(
      request(app.getHttpServer()).get(`/api/v1/exports/${exportJobId}/download`),
      false,
    )
      .redirects(0)
      .expect(302);

    const presignedUrl = downloadResponse.headers.location as string;
    expect(presignedUrl).toContain('/temp-reports/');

    const objectResponse = await fetch(presignedUrl);
    expect(objectResponse.ok).toBe(true);

    const csv = await objectResponse.text();
    expect(csv).toContain('nickname');
    expect(csv).toContain('Runtime Smoke Customer');
  });
});
