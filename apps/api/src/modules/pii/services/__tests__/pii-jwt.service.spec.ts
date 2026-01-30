// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { TechEventLogService } from '../../../log/services/tech-event-log.service';
import { PiiJwtService, PiiAccessJwtPayload, ServiceJwtPayload } from '../pii-jwt.service';

describe('PiiJwtService', () => {
  let service: PiiJwtService;
  let mockConfigService: Partial<ConfigService>;
  let mockJwtService: Partial<JwtService>;
  let mockTechEventLogService: Partial<TechEventLogService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        const config: Record<string, unknown> = {
          PII_JWT_SECRET: 'test-secret-key-for-testing',
          PII_ACCESS_TOKEN_TTL: 300,
          PII_SERVICE_TOKEN_TTL: 1800,
        };
        return config[key];
      }),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock.jwt.token'),
      verify: vi.fn(),
    };

    mockTechEventLogService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PiiJwtService(
      mockConfigService as ConfigService,
      mockJwtService as JwtService,
      mockTechEventLogService as TechEventLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('issueAccessToken', () => {
    const accessTokenParams = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      tenantSchema: 'tenant_abc123',
      rmProfileId: 'pii-profile-789',
      profileStoreId: 'store-123',
      actions: ['read' as const],
    };

    it('should issue PII access token', async () => {
      const result = await service.issueAccessToken(accessTokenParams);

      expect(result).toBeDefined();
      expect(result.token).toBe('mock.jwt.token');
      expect(result.expiresIn).toBe(300);
      expect(result.jti).toBeDefined();
    });

    it('should sign token with correct payload structure', async () => {
      await service.issueAccessToken(accessTokenParams);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          tid: 'tenant-456',
          tsc: 'tenant_abc123',
          pid: 'pii-profile-789',
          psi: 'store-123',
          type: 'pii_access',
          act: ['read'],
        }),
        expect.objectContaining({
          secret: 'test-secret-key-for-testing',
          algorithm: 'HS256',
        }),
      );
    });

    it('should include iat, exp, and jti in payload', async () => {
      await service.issueAccessToken(accessTokenParams);

      const signCall = (mockJwtService.sign as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = signCall[0] as PiiAccessJwtPayload;

      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.jti).toBeDefined();
      expect(payload.exp - payload.iat).toBe(300); // TTL
    });

    it('should log token issuance event', async () => {
      await service.issueAccessToken(accessTokenParams);

      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'pii',
          payload: expect.objectContaining({
            user_id: 'user-123',
            tenant_id: 'tenant-456',
            rm_profile_id: 'pii-profile-789',
            profile_store_id: 'store-123',
            actions: ['read'],
            ttl_seconds: 300,
          }),
        }),
      );
    });

    it('should support multiple actions', async () => {
      await service.issueAccessToken({
        ...accessTokenParams,
        actions: ['read', 'write'],
      });

      const signCall = (mockJwtService.sign as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = signCall[0] as PiiAccessJwtPayload;

      expect(payload.act).toEqual(['read', 'write']);
    });

    it('should generate unique jti for each token', async () => {
      const result1 = await service.issueAccessToken(accessTokenParams);
      const result2 = await service.issueAccessToken(accessTokenParams);

      expect(result1.jti).not.toBe(result2.jti);
    });
  });

  describe('issueServiceToken', () => {
    const serviceTokenParams = {
      service: 'report-service',
      tenantId: 'tenant-456',
      profileStoreId: 'store-123',
      jobId: 'job-789',
      originalUserId: 'user-123',
      actions: ['batch_read'],
    };

    it('should issue service token', async () => {
      const result = await service.issueServiceToken(serviceTokenParams);

      expect(result).toBeDefined();
      expect(result.token).toBe('mock.jwt.token');
      expect(result.expiresIn).toBe(1800); // Service token has longer TTL
      expect(result.jti).toBeDefined();
    });

    it('should sign token with correct service payload structure', async () => {
      await service.issueServiceToken(serviceTokenParams);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'report-service',
          tid: 'tenant-456',
          type: 'report_service',
          job_id: 'job-789',
          original_user_id: 'user-123',
          psi: 'store-123',
          act: ['batch_read'],
        }),
        expect.objectContaining({
          secret: 'test-secret-key-for-testing',
          algorithm: 'HS256',
        }),
      );
    });

    it('should include correct TTL for service tokens', async () => {
      await service.issueServiceToken(serviceTokenParams);

      const signCall = (mockJwtService.sign as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = signCall[0] as ServiceJwtPayload;

      expect(payload.exp - payload.iat).toBe(1800); // 30 minutes
    });

    it('should log service token issuance event', async () => {
      await service.issueServiceToken(serviceTokenParams);

      expect(mockTechEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'pii',
          payload: expect.objectContaining({
            service: 'report-service',
            tenant_id: 'tenant-456',
            profile_store_id: 'store-123',
            job_id: 'job-789',
            original_user_id: 'user-123',
            actions: ['batch_read'],
            ttl_seconds: 1800,
          }),
        }),
      );
    });
  });

  describe('Configuration', () => {
    it('should use default secret when not configured', () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const newService = new PiiJwtService(
        mockConfigService as ConfigService,
        mockJwtService as JwtService,
        mockTechEventLogService as TechEventLogService,
      );

      // Service should be created without error
      expect(newService).toBeDefined();
    });

    it('should use default TTL values when not configured', async () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PII_JWT_SECRET') return 'secret';
        return undefined; // No TTL configured
      });

      const newService = new PiiJwtService(
        mockConfigService as ConfigService,
        mockJwtService as JwtService,
        mockTechEventLogService as TechEventLogService,
      );

      const result = await newService.issueAccessToken({
        userId: 'user-1',
        tenantId: 'tenant-1',
        tenantSchema: 'schema',
        rmProfileId: 'pii-1',
        profileStoreId: 'store-1',
        actions: ['read'],
      });

      // Default TTL should be 300 seconds
      expect(result.expiresIn).toBe(300);
    });
  });
});
