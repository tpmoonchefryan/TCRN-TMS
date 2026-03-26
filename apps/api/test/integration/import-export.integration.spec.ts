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
import {
  ImportJobStatus,
} from '../../src/modules/import/dto/import.dto';
import {
  ExportFormat,
  ExportJobStatus,
  ExportJobType,
} from '../../src/modules/export/dto/export.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Import/Export Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let exportJobId: string | undefined;

  const withAuth = (req: request.Test, includeTalentHeader = true) => {
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

    if (includeTalentHeader) {
      req.set('X-Talent-Id', talentId);
    }

    return req;
  };

  const createExportJob = () =>
    withAuth(
      request(app.getHttpServer()).post('/api/v1/exports'),
    ).send({
      jobType: ExportJobType.CUSTOMER_EXPORT,
      format: ExportFormat.CSV,
    });

  const ensureExportJob = async (): Promise<string> => {
    if (exportJobId) {
      return exportJobId;
    }

    const response = await createExportJob().expect(201);
    exportJobId = response.body.data.id;
    return exportJobId;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
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
      const response = await createExportJob().expect(201);

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

    it('should reject supported-but-unimplemented generic export job types', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/exports'),
      )
        .send({
          jobType: ExportJobType.REPORT_EXPORT,
          format: ExportFormat.CSV,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toContain('customer_export only');
    });

    it('should reject includePii for generic customer exports', async () => {
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
      expect(response.body.error.message).toContain('includePii');
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
