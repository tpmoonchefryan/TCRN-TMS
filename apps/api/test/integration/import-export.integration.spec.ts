// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import/Export Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@tcrn/database';
import {
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
import {
  ImportJobStatus,
} from '../../src/modules/import/dto/import.dto';
import {
  ExportFormat,
  ExportJobStatus,
  ExportJobType,
} from '../../src/modules/export/dto/export.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
import {
  findImportQueueJobByDataJobId,
  removeExportQueueJobsByDataJobIds,
  removeImportQueueJobsByDataJobIds,
} from './queue-test-utils';

describe('Import/Export Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let minioService: MinioService;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let exportJobId: string | undefined;
  let marshmallowExportJobId: string | undefined;
  const createdExportQueueJobIds = new Set<string>();
  const createdImportQueueJobIds = new Set<string>();
  const createdImportObjectNames = new Set<string>();

  const withAuth = (req: request.Test, includeTalentHeader = true) => {
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

    if (includeTalentHeader) {
      req.set('X-Talent-Id', talentId);
    }

    return req;
  };

  const createExportJob = async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post('/api/v1/exports'),
    )
      .send({
        jobType: ExportJobType.CUSTOMER_EXPORT,
        format: ExportFormat.CSV,
      })
      .expect(201);

    createdExportQueueJobIds.add(response.body.data.id);
    return response;
  };

  const ensureExportJob = async (): Promise<string> => {
    if (exportJobId) {
      return exportJobId;
    }

    const response = await createExportJob();
    exportJobId = response.body.data.id;
    return exportJobId;
  };

  const createMarshmallowExportJob = async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(`/api/v1/talents/${talentId}/marshmallow/export`),
      false,
    )
      .send({
        format: 'csv',
      })
      .expect(201);

    createdExportQueueJobIds.add(response.body.data.jobId);
    return response;
  };

  const ensureMarshmallowExportJob = async (): Promise<string> => {
    if (marshmallowExportJobId) {
      return marshmallowExportJobId;
    }

    const response = await createMarshmallowExportJob();
    marshmallowExportJobId = response.body.data.jobId;
    return marshmallowExportJobId;
  };

  const markExportJobCompleted = async (
    jobId: string,
    jobType: 'customer_export' | 'marshmallow_export',
    fileName: string,
  ) => {
    const filePath = `${tenantFixture.schemaName}/${jobId}/${fileName}`;

    await prisma.$executeRawUnsafe(
      `UPDATE "${tenantFixture.schemaName}".export_job
       SET status = 'success',
           file_path = $1,
           file_name = $2,
           total_records = 1,
           processed_records = 1,
           completed_at = NOW(),
           expires_at = NOW() + INTERVAL '7 days',
           updated_at = NOW()
       WHERE id = $3::uuid
         AND job_type = $4`,
      filePath,
      fileName,
      jobId,
      jobType,
    );

    return filePath;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    minioService = moduleFixture.get(MinioService);
    tenantFixture = await createTestTenantFixture(prisma, 'impexp');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `impexp_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_IE_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Import Export Test Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_IE_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Import Export Test Talent',
      displayName: 'Import Export Test Talent',
      homepagePath: `impexp-${Date.now()}`,
      createdBy: testUser.id,
    });

    talentId = talent.id;

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
    await removeImportQueueJobsByDataJobIds(createdImportQueueJobIds);
    await removeExportQueueJobsByDataJobIds(createdExportQueueJobIds);
    for (const objectName of createdImportObjectNames) {
      try {
        await minioService.deleteFile(BUCKETS.IMPORTS, objectName);
      } catch {
        // Ignore cleanup drift for already-deleted test objects.
      }
    }
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('Import Jobs', () => {
    it('should return a stable error when no file is uploaded', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/imports/customers/individuals'),
      )
        .field('talentId', talentId)
        .expect(201);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('should return the individual import template', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/imports/customers/individuals/template'),
      ).expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      const headerLine = response.text.replace(/^\ufeff/, '').split('\n')[0]?.trim();
      expect(headerLine).toBe(
        'external_id,nickname,primary_language,status_code,tags,notes',
      );
    });

    it('should return the company import template with only currently supported columns', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/imports/customers/companies/template'),
      ).expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      const headerLine = response.text.replace(/^\ufeff/, '').split('\n')[0]?.trim();
      expect(headerLine).toBe(
        'external_id,nickname,company_legal_name,company_short_name,registration_number,vat_id,establishment_date,business_segment_code,website,status_code,tags,notes',
      );
    });

    it('uploads individual import csv into tenant-scoped MinIO object and queues a complete worker payload', async () => {
      const csvContent = [
        'external_id,nickname,primary_language,status_code,tags,notes',
        'EXT001,Queued User,zh,,vip,queued from integration',
      ].join('\n');

      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/imports/customers/individuals'),
      )
        .field('talentId', talentId)
        .field('consumerCode', 'CRM_SYSTEM')
        .attach('file', Buffer.from(csvContent, 'utf8'), 'individual_import.csv')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe(ImportJobStatus.PENDING);

      const importJobId = response.body.data.id as string;
      const objectName = `${tenantFixture.schemaName}/${importJobId}.csv`;
      createdImportQueueJobIds.add(importJobId);
      createdImportObjectNames.add(objectName);

      const queueJob = await findImportQueueJobByDataJobId(importJobId);
      expect(queueJob).not.toBeNull();
      expect(queueJob?.name).toBe('process-import');
      expect(queueJob?.data).toMatchObject({
        jobId: importJobId,
        tenantId: tenantFixture.tenant.id,
        tenantSchemaName: tenantFixture.schemaName,
        talentId,
        profileStoreId: expect.any(String),
        userId: testUser.id,
        consumerCode: 'CRM_SYSTEM',
        filePath: objectName,
        totalRows: 1,
        jobType: 'customer_create',
        defaultProfileType: 'individual',
      });

      await expect(minioService.fileExists(BUCKETS.IMPORTS, objectName)).resolves.toBe(true);
    });

    it('rejects individual import csv files with headers outside the current template', async () => {
      const csvContent = [
        'external_id,nickname,primary_language,status_code,tags,notes,legacy_pii_email',
        'EXT001,Queued User,zh,,vip,queued from integration,hidden@example.com',
      ].join('\n');

      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/imports/customers/individuals'),
      )
        .field('talentId', talentId)
        .field('consumerCode', 'CRM_SYSTEM')
        .attach('file', Buffer.from(csvContent, 'utf8'), 'individual_import_invalid_headers.csv')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('CSV headers do not match the current import template');
      expect(response.body.error.details.fields).toContain('Unexpected headers: legacy_pii_email');
    });

    it('should list import jobs for the current talent profile store', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/imports/customers'),
      )
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter import jobs by status', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/imports/customers'),
      )
        .query({ status: ImportJobStatus.PENDING })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should return 404 for a non-existent import job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/imports/customers/individual_import/00000000-0000-0000-0000-000000000000'),
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });

    it('should return 404 when cancelling a non-existent import job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).delete('/api/v1/imports/customers/individual_import/00000000-0000-0000-0000-000000000000'),
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });
  });

  describe('Export Jobs', () => {
    it('should create an export job for customer data', async () => {
      const response = await createExportJob();

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe(ExportJobStatus.PENDING);
      expect(response.body.data.jobType).toBe(ExportJobType.CUSTOMER_EXPORT);

      exportJobId = response.body.data.id;
    });

    it('should reject an invalid export job type', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/exports'),
      )
        .send({
          jobType: 'INVALID_TYPE',
          format: ExportFormat.CSV,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject unsupported generic export job types at validation boundary', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/exports'),
      )
        .send({
          jobType: 'report_export',
          format: ExportFormat.CSV,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject includePii because generic /exports no longer exposes it', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/exports'),
      )
        .send({
          jobType: ExportJobType.CUSTOMER_EXPORT,
          format: ExportFormat.CSV,
          includePii: true,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should list export jobs for the current talent profile store', async () => {
      await ensureExportJob();

      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/exports'),
      )
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.some((item: { id: string }) => item.id === exportJobId)).toBe(true);
    });

    it('should keep marshmallow export jobs outside the generic /exports surface', async () => {
      const customerJobId = await ensureExportJob();
      const marshmallowJobId = await ensureMarshmallowExportJob();

      const listResponse = await withAuth(
        request(app.getHttpServer()).get('/api/v1/exports'),
      )
        .query({ page: 1, pageSize: 20 })
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(
        listResponse.body.data.items.some((item: { id: string }) => item.id === customerJobId),
      ).toBe(true);
      expect(
        listResponse.body.data.items.some((item: { id: string }) => item.id === marshmallowJobId),
      ).toBe(false);

      const detailResponse = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/exports/${marshmallowJobId}`),
        false,
      ).expect(404);

      expect(detailResponse.body.success).toBe(false);
      expect(detailResponse.body.error.code).toBe('RES_NOT_FOUND');
    });

    it('should return the correct dedicated marshmallow downloadUrl when a marshmallow export job is completed', async () => {
      const createResponse = await createMarshmallowExportJob();
      const jobId = createResponse.body.data.jobId as string;

      await markExportJobCompleted(jobId, 'marshmallow_export', 'marshmallow_export_test.csv');

      const response = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}`),
        false,
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobId);
      expect(response.body.data.status).toBe('success');
      expect(response.body.data.downloadUrl).toBe(
        `/api/v1/talents/${talentId}/marshmallow/export/${jobId}/download`,
      );
    });

    it('should filter export jobs by status', async () => {
      await ensureExportJob();

      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/exports'),
      )
        .query({ status: ExportJobStatus.PENDING })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should return the created export job by id', async () => {
      const jobId = await ensureExportJob();

      const response = await withAuth(
        request(app.getHttpServer()).get(`/api/v1/exports/${jobId}`),
        false,
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobId);
    });

    it('should return 404 for a non-existent export job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/exports/00000000-0000-0000-0000-000000000000'),
        false,
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });

    it('should return 404 for downloading a non-existent export job', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/exports/00000000-0000-0000-0000-000000000000/download'),
        false,
      ).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RES_NOT_FOUND');
    });

    it('should cancel a pending export job', async () => {
      const jobId = await ensureExportJob();

      const response = await withAuth(
        request(app.getHttpServer()).delete(`/api/v1/exports/${jobId}`),
        false,
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Export job cancelled');
    });
  });
});
