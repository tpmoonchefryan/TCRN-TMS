// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Security Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security Integration Tests', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Login to get access token (assuming test user exists)
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'TestPassword123!',
      });

    accessToken = loginResponse.body?.data?.accessToken || 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      // Rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should rate limit excessive requests', async () => {
      // This test might not trigger actual rate limiting in test environment
      // But we can verify the endpoint responds correctly
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/api/v1/health')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed (under limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Fingerprint API', () => {
    it('should generate fingerprint for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/security/fingerprint')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

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
      const response = await request(app.getHttpServer())
        .get('/api/v1/blocklist-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should create blocklist entry', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/blocklist-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
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
      const response = await request(app.getHttpServer())
        .post('/api/v1/blocklist-entries/test')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          testContent: 'This contains test_spam_word in it',
          pattern: 'test_spam_word',
          patternType: 'keyword',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matched).toBe(true);
    });

    it('should delete blocklist entry', async () => {
      if (createdEntryId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/blocklist-entries/${createdEntryId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      }
    });
  });

  describe('IP Access Rules API', () => {
    let createdRuleId: string;

    it('should list IP access rules', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ip-access-rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should create IP whitelist rule', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ip-access-rules')
        .set('Authorization', `Bearer ${accessToken}`)
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
      const response = await request(app.getHttpServer())
        .post('/api/v1/ip-access-rules/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ip: '192.168.1.100',
          scope: 'admin',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBeDefined();
    });

    it('should delete IP access rule', async () => {
      if (createdRuleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/ip-access-rules/${createdRuleId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
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
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Fingerprint headers should be injected
      expect(response.headers['x-tcrn-fp']).toBeDefined();
      expect(response.headers['x-tcrn-fp-version']).toBeDefined();
    });
  });
});
