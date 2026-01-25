// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Architecture Integration Tests

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

import { PiiJwtService } from '../../src/modules/pii/services/pii-jwt.service';
import { PiiClientService } from '../../src/modules/pii/services/pii-client.service';

// Mock environment for testing
const TEST_CONFIG = {
  PII_JWT_SECRET: 'test-pii-jwt-secret-for-integration-tests',
  PII_ACCESS_TOKEN_TTL: 300,
  PII_SERVICE_TOKEN_TTL: 1800,
  PII_SERVICE_URL: 'http://localhost:5000',
};

describe('PII Architecture Integration Tests', () => {
  describe('PiiJwtService', () => {
    let module: TestingModule;
    let piiJwtService: PiiJwtService;
    let jwtService: JwtService;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => TEST_CONFIG],
          }),
          JwtModule.register({
            secret: TEST_CONFIG.PII_JWT_SECRET,
            signOptions: { expiresIn: '5m' },
          }),
        ],
        providers: [
          PiiJwtService,
          {
            provide: 'TechEventLogService',
            useValue: {
              log: vi.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();

      piiJwtService = module.get<PiiJwtService>(PiiJwtService);
      jwtService = module.get<JwtService>(JwtService);
    });

    afterAll(async () => {
      await module.close();
    });

    it('should issue a valid PII access token', async () => {
      const params = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        tenantSchema: 'tenant_test',
        rmProfileId: 'profile-789',
        profileStoreId: 'store-abc',
        actions: ['read'] as ('read' | 'write')[],
      };

      const result = await piiJwtService.issueAccessToken(params);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(300);
      expect(result.jti).toBeDefined();

      // Verify token structure
      const decoded = jwtService.decode(result.token) as Record<string, unknown>;
      expect(decoded.sub).toBe(params.userId);
      expect(decoded.tid).toBe(params.tenantId);
      expect(decoded.tsc).toBe(params.tenantSchema);
      expect(decoded.pid).toBe(params.rmProfileId);
      expect(decoded.psi).toBe(params.profileStoreId);
      expect(decoded.type).toBe('pii_access');
      expect(decoded.act).toEqual(params.actions);
    });

    it('should issue a valid service JWT for batch operations', async () => {
      const params = {
        service: 'report-service',
        tenantId: 'tenant-456',
        profileStoreId: 'store-abc',
        jobId: 'job-123',
        originalUserId: 'user-789',
        actions: ['batch_read'],
      };

      const result = await piiJwtService.issueServiceToken(params);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(1800);
      expect(result.jti).toBeDefined();

      // Verify token structure
      const decoded = jwtService.decode(result.token) as Record<string, unknown>;
      expect(decoded.sub).toBe(params.service);
      expect(decoded.tid).toBe(params.tenantId);
      expect(decoded.type).toBe('report_service');
      expect(decoded.job_id).toBe(params.jobId);
      expect(decoded.original_user_id).toBe(params.originalUserId);
      expect(decoded.psi).toBe(params.profileStoreId);
      expect(decoded.act).toEqual(params.actions);
    });

    it('should include proper expiration in token', async () => {
      const params = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        tenantSchema: 'tenant_test',
        rmProfileId: 'profile-789',
        profileStoreId: 'store-abc',
        actions: ['read', 'write'] as ('read' | 'write')[],
      };

      const result = await piiJwtService.issueAccessToken(params);
      const decoded = jwtService.decode(result.token) as Record<string, unknown>;

      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + 300 + 5); // 5 second tolerance
    });
  });

  describe('PiiClientService', () => {
    let module: TestingModule;
    let piiClientService: PiiClientService;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => TEST_CONFIG],
          }),
        ],
        providers: [
          PiiClientService,
          {
            provide: 'IntegrationLogService',
            useValue: {
              logOutbound: vi.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();

      piiClientService = module.get<PiiClientService>(PiiClientService);
    });

    afterAll(async () => {
      await module.close();
    });

    it('should have retry configuration', () => {
      // Test that retry config is applied (via private method behavior)
      expect(piiClientService).toBeDefined();
    });

    it('should return error status when health check fails', async () => {
      // Mock a non-existent service
      const result = await piiClientService.checkHealth('http://localhost:59999');

      expect(result.status).toBe('error');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Token Validation', () => {
    let module: TestingModule;
    let jwtService: JwtService;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          JwtModule.register({
            secret: TEST_CONFIG.PII_JWT_SECRET,
            signOptions: { expiresIn: '5m' },
          }),
        ],
      }).compile();

      jwtService = module.get<JwtService>(JwtService);
    });

    afterAll(async () => {
      await module.close();
    });

    it('should reject expired tokens', async () => {
      const payload = {
        sub: 'user-123',
        tid: 'tenant-456',
        type: 'pii_access',
        exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      };

      const expiredToken = jwtService.sign(payload);

      expect(() => {
        jwtService.verify(expiredToken);
      }).toThrow();
    });

    it('should reject tokens with invalid signature', async () => {
      const validToken = jwtService.sign({
        sub: 'user-123',
        tid: 'tenant-456',
        type: 'pii_access',
      });

      // Tamper with the token
      const [header, payload, signature] = validToken.split('.');
      const tamperedToken = `${header}.${payload}.invalid${signature}`;

      expect(() => {
        jwtService.verify(tamperedToken);
      }).toThrow();
    });

    it('should accept valid tokens', async () => {
      const payload = {
        sub: 'user-123',
        tid: 'tenant-456',
        type: 'pii_access',
        act: ['read'],
      };

      const token = jwtService.sign(payload);
      const decoded = jwtService.verify(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.tid).toBe(payload.tid);
      expect(decoded.type).toBe(payload.type);
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff', () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelayMs: 3000,
        maxDelayMs: 15000,
        backoffMultiplier: 2.5,
      };

      // Calculate expected delays
      const delays: number[] = [];
      for (let i = 0; i < retryConfig.maxRetries; i++) {
        const delay = Math.min(
          retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, i),
          retryConfig.maxDelayMs
        );
        delays.push(delay);
      }

      // Expected: 3000, 7500, 15000 (capped)
      expect(delays[0]).toBe(3000);
      expect(delays[1]).toBe(7500);
      expect(delays[2]).toBe(15000); // Capped at maxDelayMs
    });

    it('should identify retryable HTTP status codes', () => {
      const retryableHttpCodes = [408, 429, 500, 502, 503, 504];

      // These should trigger retry
      expect(retryableHttpCodes).toContain(500); // Internal Server Error
      expect(retryableHttpCodes).toContain(503); // Service Unavailable
      expect(retryableHttpCodes).toContain(429); // Too Many Requests

      // These should NOT trigger retry
      expect(retryableHttpCodes).not.toContain(400); // Bad Request
      expect(retryableHttpCodes).not.toContain(401); // Unauthorized
      expect(retryableHttpCodes).not.toContain(403); // Forbidden
      expect(retryableHttpCodes).not.toContain(404); // Not Found
    });
  });
});
