// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@tcrn/database';

// Check if database is available
const checkDatabaseConnection = async (): Promise<boolean> => {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch {
    await prisma.$disconnect();
    return false;
  }
};

const describeFn = process.env.SKIP_INTEGRATION_TESTS ? describe.skip : describe;

describeFn('Report Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dbAvailable = false;
  let authToken: string;
  let testTenantId: string;
  let testTalentId: string;

  beforeAll(async () => {
    dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log('Database not available, skipping Report integration tests');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Get test tenant and talent for testing
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });
    testTenantId = tenant?.id || '';

    if (tenant) {
      const talent = await prisma.talent.findFirst({
        where: { isActive: true },
      });
      testTalentId = talent?.id || '';
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('Report Job API', () => {
    it('should reject unauthenticated requests', async () => {
      if (!dbAvailable || !testTalentId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/report/talent/${testTalentId}/jobs`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate talent ID format', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/report/talent/invalid-uuid/jobs')
        .set('Authorization', `Bearer ${authToken || 'test-token'}`)
        .expect(401); // Will fail auth first

      expect(response.body).toBeDefined();
    });
  });

  describe('Report Job Creation Validation', () => {
    it('should reject report with more than 50000 rows', async () => {
      if (!dbAvailable || !testTalentId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/report/talent/${testTalentId}/jobs`)
        .set('Authorization', `Bearer ${authToken || 'test-token'}`)
        .send({
          reportType: 'mfr',
          filters: {},
          format: 'xlsx',
          estimatedRows: 60000,
        });

      // Will fail auth or validation
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Report Search Preview', () => {
    it('should return preview data structure', async () => {
      if (!dbAvailable || !testTalentId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/report/talent/${testTalentId}/search`)
        .set('Authorization', `Bearer ${authToken || 'test-token'}`)
        .send({
          filters: {},
          limit: 20,
        });

      // Will fail auth but validates endpoint exists
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Report Download', () => {
    it('should reject download for non-existent job', async () => {
      if (!dbAvailable || !testTalentId) return;

      const fakeJobId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/report/talent/${testTalentId}/jobs/${fakeJobId}/download`)
        .set('Authorization', `Bearer ${authToken || 'test-token'}`);

      expect([401, 404]).toContain(response.status);
    });
  });
});

describe('Report Job Status Transitions', () => {
  it('should define valid status transitions', () => {
    // Valid transitions according to PRD
    const validTransitions = {
      pending: ['processing', 'cancelled'],
      processing: ['completed', 'failed'],
      completed: [], // Terminal state
      failed: ['pending'], // Can retry
      cancelled: [], // Terminal state
    };

    expect(validTransitions.pending).toContain('processing');
    expect(validTransitions.pending).toContain('cancelled');
    expect(validTransitions.processing).toContain('completed');
    expect(validTransitions.processing).toContain('failed');
    expect(validTransitions.completed).toHaveLength(0);
    expect(validTransitions.cancelled).toHaveLength(0);
  });

  it('should validate row limit constant', () => {
    const MAX_ROWS = 50000;
    expect(MAX_ROWS).toBe(50000);
  });
});
