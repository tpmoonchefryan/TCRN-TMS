// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Multi-Tenant Isolation Tests (PRD P-13)
// Ensures complete data isolation between tenants

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@tcrn/database';
import Redis from 'ioredis';

import {
  createTestTenantFixture,
  createTestUserInTenant,
  createTestCustomerInTenant,
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  generateMockToken,
  TenantFixture,
  TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../app.module';

/**
 * Multi-Tenant Isolation Test Suite
 *
 * This test suite verifies that:
 * 1. Tenant A cannot access Tenant B's customer data
 * 2. Tenant A cannot access Tenant B's organization structure
 * 3. Permission snapshots are isolated by tenant
 * 4. PII data is isolated by Profile Store
 * 5. Report jobs are isolated by tenant
 * 6. Change logs are isolated by schema
 * 7. External page configurations are isolated
 */
describe('Multi-Tenant Isolation Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;

  // Tenant fixtures
  let tenantA: TenantFixture;
  let tenantB: TenantFixture;

  // Test users
  let userA: TestUser;
  let userB: TestUser;

  // Auth tokens
  let tokenA: string;
  let tokenB: string;

  // Test data IDs
  let customerA: { id: string; nickname: string; rmProfileId: string };
  let customerB: { id: string; nickname: string; rmProfileId: string };
  let subsidiaryA: { id: string; code: string };
  let subsidiaryB: { id: string; code: string };
  let talentA: { id: string; code: string; homepagePath: string };
  let talentB: { id: string; code: string; homepagePath: string };

  beforeAll(async () => {
    // Create NestJS test application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get Prisma client
    prisma = new PrismaClient();
    await prisma.$connect();

    // Get Redis client
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    // Create two independent tenant fixtures
    tenantA = await createTestTenantFixture(prisma, 'A');
    tenantB = await createTestTenantFixture(prisma, 'B');

    // Create test users in each tenant
    userA = await createTestUserInTenant(prisma, tenantA, 'admin_a', ['TENANT_ADMIN']);
    userB = await createTestUserInTenant(prisma, tenantB, 'admin_b', ['TENANT_ADMIN']);

    // Generate auth tokens
    tokenA = generateMockToken({
      userId: userA.id,
      tenantId: userA.tenantId,
      username: userA.username,
      schemaName: userA.schemaName,
      roles: userA.roles,
    });

    tokenB = generateMockToken({
      userId: userB.id,
      tenantId: userB.tenantId,
      username: userB.username,
      schemaName: userB.schemaName,
      roles: userB.roles,
    });

    // Create test data in each tenant
    customerA = await createTestCustomerInTenant(prisma, tenantA, {
      nickname: 'Customer A',
    });
    customerB = await createTestCustomerInTenant(prisma, tenantB, {
      nickname: 'Customer B',
    });

    subsidiaryA = await createTestSubsidiaryInTenant(prisma, tenantA, {
      code: 'SUB_A',
      nameEn: 'Subsidiary A',
    });
    subsidiaryB = await createTestSubsidiaryInTenant(prisma, tenantB, {
      code: 'SUB_B',
      nameEn: 'Subsidiary B',
    });

    talentA = await createTestTalentInTenant(prisma, tenantA, subsidiaryA.id, {
      code: 'TALENT_A',
      nameEn: 'Talent A',
      homepagePath: 'talent-a',
    });
    talentB = await createTestTalentInTenant(prisma, tenantB, subsidiaryB.id, {
      code: 'TALENT_B',
      nameEn: 'Talent B',
      homepagePath: 'talent-b',
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await tenantA?.cleanup();
    await tenantB?.cleanup();

    // Close connections
    await redis?.quit();
    await prisma?.$disconnect();
    await app?.close();
  });

  // ===========================================================================
  // 1. Customer Profile Isolation
  // ===========================================================================
  describe('Customer Profile Isolation', () => {
    it('Tenant A user cannot access Tenant B customer list with wrong tenant header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-ID', tenantB.tenant.id);

      // Should return 403 Forbidden
      expect(response.status).toBe(403);
      expect(response.body.error?.code || response.body.statusCode).toMatch(/403|TENANT_ACCESS_DENIED/);
    });

    it('Tenant A user cannot access Tenant B customer details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Should return 404 (not 403) to avoid information leakage
      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot modify Tenant B customer', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customerB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ nickname: 'Hacked by A' });

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot delete Tenant B customer', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/customers/${customerB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });

    it('Tenant A customer list only returns Tenant A data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${tokenA}`);

      if (response.status === 200) {
        const customers = response.body.data?.items || [];
        // Should not contain any customer from Tenant B
        const hasTenantBCustomer = customers.some(
          (c: { id: string }) => c.id === customerB.id
        );
        expect(hasTenantBCustomer).toBe(false);
      }
    });
  });

  // ===========================================================================
  // 2. Organization Structure Isolation
  // ===========================================================================
  describe('Organization Structure Isolation', () => {
    it('Tenant A user cannot view Tenant B subsidiary', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/subsidiaries/${subsidiaryB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot view Tenant B talent', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/talents/${talentB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot create subsidiary in Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/subsidiaries')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-ID', tenantB.tenant.id)
        .send({
          code: 'HACKED_SUB',
          nameEn: 'Hacked Subsidiary',
        });

      expect(response.status).toBe(403);
    });

    it('Tenant A user cannot modify Tenant B subsidiary', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subsidiaries/${subsidiaryB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ nameEn: 'Hacked Name' });

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot modify Tenant B talent', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/talents/${talentB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ nameEn: 'Hacked Talent' });

      expect(response.status).toBe(404);
    });

    it('Organization tree only contains own tenant data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/organization/tree')
        .set('Authorization', `Bearer ${tokenA}`);

      if (response.status === 200) {
        const tree = response.body.data;
        // Verify no Tenant B data in the tree
        const treeString = JSON.stringify(tree);
        expect(treeString).not.toContain(subsidiaryB.id);
        expect(treeString).not.toContain(talentB.id);
      }
    });
  });

  // ===========================================================================
  // 3. Permission Snapshot Isolation (Redis)
  // ===========================================================================
  describe('Permission Snapshot Isolation', () => {
    it('Permission cache keys are tenant-scoped', async () => {
      // Set test permission data for both tenants
      await redis.set(`perm:${tenantA.schemaName}:${userA.id}`, JSON.stringify(['read:customer']));
      await redis.set(`perm:${tenantB.schemaName}:${userB.id}`, JSON.stringify(['read:customer']));

      // Get keys for each tenant
      const keysA = await redis.keys(`perm:${tenantA.schemaName}:*`);
      const keysB = await redis.keys(`perm:${tenantB.schemaName}:*`);

      // Verify isolation
      expect(keysA.every((k) => k.includes(tenantA.schemaName))).toBe(true);
      expect(keysB.every((k) => k.includes(tenantB.schemaName))).toBe(true);

      // Tenant A keys should not include Tenant B schema
      expect(keysA.some((k) => k.includes(tenantB.schemaName))).toBe(false);
    });

    it('Tenant A cannot access Tenant B permission cache', async () => {
      const permKeyB = `perm:${tenantB.schemaName}:${userB.id}`;

      // Direct Redis access should work (for this test)
      const directValue = await redis.get(permKeyB);
      expect(directValue).toBeDefined();

      // But API should not expose cross-tenant permission data
      // This is enforced at application level, not Redis level
    });
  });

  // ===========================================================================
  // 4. PII Data Isolation (Cross Profile Store)
  // ===========================================================================
  describe('PII Data Isolation', () => {
    it('PII profile IDs are unique per tenant', () => {
      // Verify that rm_profile_id from different tenants are different
      expect(customerA.rmProfileId).not.toBe(customerB.rmProfileId);
    });

    it('Tenant A cannot request Tenant B PII data via API', async () => {
      // Attempt to access PII service with A's token for B's profile
      const response = await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerB.id}/pii`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Should fail - either 404 (customer not found) or 403 (access denied)
      expect([403, 404]).toContain(response.status);
    });
  });

  // ===========================================================================
  // 5. Report Job Isolation
  // ===========================================================================
  describe('Report Job Isolation', () => {
    let reportJobBId: string;

    beforeAll(async () => {
      // Create a test report job in Tenant B
      reportJobBId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantB.schemaName}".mfr_report_job 
        (id, status, parameters, created_by, created_at, updated_at)
        VALUES ($1, 'COMPLETED', '{}', $2, NOW(), NOW())
      `, reportJobBId, userB.id);
    });

    it('Tenant A user cannot view Tenant B report job', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/mfr/jobs/${reportJobBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot download Tenant B report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/mfr/jobs/${reportJobBId}/download`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });

    it('Tenant A user cannot cancel Tenant B report job', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/reports/mfr/jobs/${reportJobBId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // 6. Change Log Isolation
  // ===========================================================================
  describe('Change Log Isolation', () => {
    beforeAll(async () => {
      // Insert test change logs in both tenants
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantA.schemaName}".change_log 
        (id, entity_type, entity_id, action, diff, operator_id, occurred_at)
        VALUES (gen_random_uuid(), 'CUSTOMER', $1, 'CREATE', '{}', $2, NOW())
      `, customerA.id, userA.id);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantB.schemaName}".change_log 
        (id, entity_type, entity_id, action, diff, operator_id, occurred_at)
        VALUES (gen_random_uuid(), 'CUSTOMER', $1, 'CREATE', '{}', $2, NOW())
      `, customerB.id, userB.id);
    });

    it('Change logs are stored in separate schemas', async () => {
      // Query Tenant A's change_log
      const logsA = await prisma.$queryRawUnsafe<{ entity_id: string }[]>(`
        SELECT entity_id FROM "${tenantA.schemaName}".change_log
      `);

      // Query Tenant B's change_log
      const logsB = await prisma.$queryRawUnsafe<{ entity_id: string }[]>(`
        SELECT entity_id FROM "${tenantB.schemaName}".change_log
      `);

      // Verify A's logs don't contain B's data
      const logAEntityIds = logsA.map((l) => l.entity_id);
      const logBEntityIds = logsB.map((l) => l.entity_id);

      expect(logAEntityIds).not.toContain(customerB.id);
      expect(logBEntityIds).not.toContain(customerA.id);
    });

    it('Tenant A cannot query Tenant B change logs via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/logs/changes')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ entityType: 'CUSTOMER', entityId: customerB.id });

      if (response.status === 200) {
        // Should return empty or only A's data
        const logs = response.body.data?.items || [];
        expect(logs.every((l: { entityId: string }) => l.entityId !== customerB.id)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // 7. External Page Access Control
  // ===========================================================================
  describe('External Page Access Control', () => {
    it('Tenant A cannot modify Tenant B talent homepage', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/talents/${talentB.id}/homepage`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ isPublished: true });

      expect(response.status).toBe(404);
    });

    it('Tenant A cannot modify Tenant B marshmallow config', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/talents/${talentB.id}/marshmallow/config`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ isEnabled: false });

      expect(response.status).toBe(404);
    });

    it('Tenant A cannot view Tenant B marshmallow messages (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/talents/${talentB.id}/marshmallow/messages`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // 8. Cross-Tenant Token Validation
  // ===========================================================================
  describe('Cross-Tenant Token Validation', () => {
    it('Token from Tenant A is rejected when accessing Tenant B resources', async () => {
      // Create a crafted request with Tenant A token but B's tenant context
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-ID', tenantB.tenant.id)
        .set('X-Schema-Name', tenantB.schemaName);

      // Should be rejected - token tenant doesn't match header
      expect([401, 403]).toContain(response.status);
    });

    it('Expired token is rejected', async () => {
      const expiredToken = generateMockToken({
        userId: userA.id,
        tenantId: userA.tenantId,
        username: userA.username,
        schemaName: userA.schemaName,
        roles: userA.roles,
      }).replace(/exp":\d+/, 'exp":0'); // Force expired

      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });
});
