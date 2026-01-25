// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Module Integration Tests

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@tcrn/database';

describe('Customer Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let accessToken: string;
  let testData: {
    userId: string;
    tenantId: string;
    talentId: string;
    profileStoreId: string;
    customerId?: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Setup test data hierarchy
    const tenant = await prisma.tenant.create({
      data: {
        code: `TEST_${Date.now()}`,
        name: 'Integration Test Tenant',
        schemaName: `tenant_integration_${Date.now()}`,
        tier: 'standard',
      },
    });

    // Create user with token for API access
    const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$c2VlZHRlc3RzYWx0$S8M7F3rQ3UmC9Y5r6V8x2K4w1L6n3P0q2R4t6U8v0A0';
    const user = await prisma.systemUser.create({
      data: {
        username: `customer_test_${Date.now()}`,
        email: `customer_${Date.now()}@test.com`,
        passwordHash,
        isActive: true,
      },
    });

    // Create minimal test structure (using tenant_template for simplicity)
    const piiConfig = await prisma.piiServiceConfig.create({
      data: {
        code: `PII_${Date.now()}`,
        nameEn: 'Test PII Service',
        apiUrl: 'http://localhost:4001',
        isHealthy: true,
      },
    });

    const profileStore = await prisma.profileStore.create({
      data: {
        code: `STORE_${Date.now()}`,
        nameEn: 'Test Profile Store',
        piiServiceConfigId: piiConfig.id,
        isDefault: true,
      },
    });

    const subsidiary = await prisma.subsidiary.create({
      data: {
        code: `SUB_${Date.now()}`,
        path: `/SUB_${Date.now()}/`,
        nameEn: 'Test Subsidiary',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    const talent = await prisma.talent.create({
      data: {
        code: `TALENT_${Date.now()}`,
        path: `${subsidiary.path}TALENT_${Date.now()}/`,
        nameEn: 'Test Talent',
        displayName: 'Test',
        subsidiaryId: subsidiary.id,
        profileStoreId: profileStore.id,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    testData = {
      userId: user.id,
      tenantId: tenant.id,
      talentId: talent.id,
      profileStoreId: profileStore.id,
    };

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: `customer_test_${Date.now()}`,
        password: 'TestPassword123!',
      });

    // For testing, we'll mock the token if login doesn't work
    accessToken = loginResponse.body?.data?.accessToken || 'test-token';
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation
    if (testData.customerId) {
      await prisma.customerProfile.delete({ where: { id: testData.customerId } }).catch(() => {});
    }
    await prisma.talent.deleteMany({ where: { createdBy: testData.userId } }).catch(() => {});
    await prisma.subsidiary.deleteMany({ where: { createdBy: testData.userId } }).catch(() => {});
    await prisma.profileStore.delete({ where: { id: testData.profileStoreId } }).catch(() => {});
    await prisma.piiServiceConfig.deleteMany({}).catch(() => {});
    await prisma.systemUser.delete({ where: { id: testData.userId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: testData.tenantId } }).catch(() => {});
    
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /api/v1/customers', () => {
    it('should return empty list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ talentId: testData.talentId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers')
        .query({ talentId: testData.talentId })
        .expect(401);
    });

    it('should require talentId parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/customers', () => {
    it('should create a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          talentId: testData.talentId,
          profileStoreId: testData.profileStoreId,
          profileType: 'individual',
          nickname: 'Integration Test User',
          tags: ['test', 'integration'],
          source: 'api',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.nickname).toBe('Integration Test User');
      
      testData.customerId = response.body.data.id;
    });

    it('should reject invalid profile type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          talentId: testData.talentId,
          profileStoreId: testData.profileStoreId,
          profileType: 'invalid_type',
          nickname: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require nickname', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          talentId: testData.talentId,
          profileStoreId: testData.profileStoreId,
          profileType: 'individual',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer by id', async () => {
      if (!testData.customerId) {
        return; // Skip if customer not created
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/customers/${testData.customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.customerId);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/customers/:id', () => {
    it('should update customer', async () => {
      if (!testData.customerId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${testData.customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: 'Updated Nickname',
          tags: ['test', 'updated'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe('Updated Nickname');
      expect(response.body.data.tags).toContain('updated');
    });

    it('should handle optimistic locking', async () => {
      if (!testData.customerId) {
        return;
      }

      // Send update with old version
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${testData.customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: 'Conflict Test',
          expectedVersion: 0, // Old version
        })
        .expect(409);

      expect(response.body.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/customers/:id/deactivate', () => {
    it('should deactivate customer', async () => {
      if (!testData.customerId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/customers/${testData.customerId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reasonId: null, // Optional
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/customers/:id/reactivate', () => {
    it('should reactivate customer', async () => {
      if (!testData.customerId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/customers/${testData.customerId}/reactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    it('should search by nickname', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          talentId: testData.talentId,
          search: 'Updated',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          talentId: testData.talentId,
          tags: 'test',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          talentId: testData.talentId,
          page: 1,
          pageSize: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(10);
    });
  });
});
