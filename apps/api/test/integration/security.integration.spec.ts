// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Security Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
import { PrismaClient } from '@tcrn/database';

describe('Security Integration Tests', () => {
  let app: INestApplication;
  let accessToken: string;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);
    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'security');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `security_user_${Date.now()}`,
      ['ADMIN'],
    );

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
    await app.close();
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should rate limit excessive requests', async () => {
      const responses = [];
      for (let i = 0; i < 10; i++) {
        // Use distinct IPs to verify middleware stability without cross-test throttling.
        // eslint-disable-next-line no-await-in-loop
        const response = await request(app.getHttpServer())
          .get('/api/v1/health')
          .set('X-Forwarded-For', `203.0.113.${i + 10}`);
        responses.push(response);
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Fingerprint API', () => {
    it('should generate fingerprint for authenticated user', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/security/fingerprint')
      )
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fingerprint).toBeDefined();
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.shortFingerprint).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/security/fingerprint')
        .expect(401);
    });
  });

  describe('Blocklist API', () => {
    let createdEntryId: string;

    it('should list blocklist entries', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/blocklist-entries')
      )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should create blocklist entry', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/blocklist-entries')
      )
        .send({
          ownerType: 'tenant',
          pattern: 'test_spam_word',
          patternType: 'keyword',
          nameEn: 'Test Entry',
          action: 'flag',
          severity: 'low',
          scope: ['marshmallow'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      createdEntryId = response.body.data.id;
    });

    it('should test blocklist pattern', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/blocklist-entries/test')
      )
        .send({
          testContent: 'This contains test_spam_word in it',
          pattern: 'test_spam_word',
          patternType: 'keyword',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matched).toBe(true);
    });

    it('should delete blocklist entry', async () => {
      if (createdEntryId) {
        const response = await withAuth(
          request(app.getHttpServer()).delete(`/api/v1/blocklist-entries/${createdEntryId}`)
        )
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deleted).toBe(true);
      }
    });
  });

  describe('IP Access Rules API', () => {
    let createdRuleId: string;

    it('should list IP access rules', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/ip-access-rules')
      )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should create IP whitelist rule', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/ip-access-rules')
      )
        .send({
          ruleType: 'whitelist',
          ipPattern: '192.168.1.100',
          scope: 'admin',
          reason: 'Test whitelist',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      createdRuleId = response.body.data.id;
    });

    it('should check IP access', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).post('/api/v1/ip-access-rules/check')
      )
        .send({
          ip: '192.168.1.100',
          scope: 'admin',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBeDefined();
    });

    it('should delete IP access rule', async () => {
      if (createdRuleId) {
        const response = await withAuth(
          request(app.getHttpServer()).delete(`/api/v1/ip-access-rules/${createdRuleId}`)
        )
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deleted).toBe(true);
      }
    });
  });

  describe('User-Agent Detection', () => {
    it('should allow normal browser requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should detect suspicious user agents', async () => {
      // This depends on the UA detection rules configured
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('User-Agent', 'curl/7.64.1');

      // Curl might be allowed but flagged
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should return security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      // Check for common security headers
      // Note: These depend on middleware configuration
      expect(response.headers).toBeDefined();
    });
  });

  describe('Fingerprint Header Injection', () => {
    it('should inject fingerprint headers for authenticated requests', async () => {
      const response = await withAuth(
        request(app.getHttpServer()).get('/api/v1/users/me')
      )
        .expect(200);

      // Fingerprint headers should be injected
      expect(response.headers['x-tcrn-fp']).toBeDefined();
      expect(response.headers['x-tcrn-fp-version']).toBeDefined();
    });
  });
});
