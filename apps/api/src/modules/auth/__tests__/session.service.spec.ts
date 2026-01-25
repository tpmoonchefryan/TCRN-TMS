// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RedisService } from '../../redis';

// Mock prisma - must be at top level before imports that use it
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

// Import after mock setup
import { SessionService, SessionInfo } from '../session.service';
import { prisma } from '@tcrn/database';

// Get typed mock references
const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('SessionService', () => {
  let service: SessionService;
  let mockRedisService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testTenantSchema = 'tenant_abc123';
  const testSessionId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      const mockSessions = [
        {
          id: testSessionId,
          device_info: 'Chrome on macOS',
          ip_address: '192.168.1.1',
          created_at: new Date('2026-01-20T10:00:00Z'),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          device_info: 'Safari on iOS',
          ip_address: '192.168.1.2',
          created_at: new Date('2026-01-19T08:00:00Z'),
        },
      ];

      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockSessions);

      const result = await service.getUserSessions(testUserId, testTenantSchema, testSessionId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual<SessionInfo>({
        id: testSessionId,
        deviceInfo: 'Chrome on macOS',
        ipAddress: '192.168.1.1',
        createdAt: mockSessions[0].created_at,
        lastActiveAt: mockSessions[0].created_at,
        isCurrent: true,
      });
      expect(result[1].isCurrent).toBe(false);
    });

    it('should return empty array when no sessions found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getUserSessions(testUserId, testTenantSchema);

      expect(result).toEqual([]);
    });

    it('should handle sessions without device info', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: testSessionId,
          device_info: null,
          ip_address: null,
          created_at: new Date(),
        },
      ]);

      const result = await service.getUserSessions(testUserId, testTenantSchema);

      expect(result[0].deviceInfo).toBeNull();
      expect(result[0].ipAddress).toBeNull();
    });

    it('should mark current session correctly', async () => {
      const currentTokenId = 'current-token-id';
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: currentTokenId, device_info: null, ip_address: null, created_at: new Date() },
        { id: 'other-token', device_info: null, ip_address: null, created_at: new Date() },
      ]);

      const result = await service.getUserSessions(testUserId, testTenantSchema, currentTokenId);

      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should return true when session is successfully revoked', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.revokeSession(testSessionId, testUserId, testTenantSchema);

      expect(result).toBe(true);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        testSessionId,
        testUserId
      );
    });

    it('should return false when session not found or already revoked', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(0);

      const result = await service.revokeSession(testSessionId, testUserId, testTenantSchema);

      expect(result).toBe(false);
    });

    it('should use correct tenant schema in query', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
      const customSchema = 'tenant_custom';

      await service.revokeSession(testSessionId, testUserId, customSchema);

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`"${customSchema}".refresh_token`),
        testSessionId,
        testUserId
      );
    });
  });

  describe('trackLoginAttempt', () => {
    const testIpAddress = '192.168.1.100';

    it('should reset failed count on successful login', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.trackLoginAttempt(
        testUserId,
        testTenantSchema,
        true,
        testIpAddress
      );

      expect(result).toEqual({
        failedCount: 0,
        isLocked: false,
        lockedUntil: null,
      });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_count = 0'),
        testUserId,
        testIpAddress
      );
    });

    it('should increment failed count on failed login', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          failed_login_count: 3,
          locked_until: null,
        },
      ]);

      const result = await service.trackLoginAttempt(
        testUserId,
        testTenantSchema,
        false,
        testIpAddress
      );

      expect(result.failedCount).toBe(3);
      expect(result.isLocked).toBe(false);
    });

    it('should lock account after 5 failed attempts', async () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          failed_login_count: 5,
          locked_until: lockedUntil,
        },
      ]);

      const result = await service.trackLoginAttempt(
        testUserId,
        testTenantSchema,
        false,
        testIpAddress
      );

      expect(result.failedCount).toBe(5);
      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toEqual(lockedUntil);
    });

    it('should return default values when user not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.trackLoginAttempt(
        testUserId,
        testTenantSchema,
        false,
        testIpAddress
      );

      expect(result).toEqual({
        failedCount: 0,
        isLocked: false,
        lockedUntil: null,
      });
    });
  });

  describe('isUserLocked', () => {
    it('should return not locked when user has no lock', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { locked_until: null },
      ]);

      const result = await service.isUserLocked(testUserId, testTenantSchema);

      expect(result).toEqual({
        isLocked: false,
        lockedUntil: null,
      });
    });

    it('should return locked when lock is in the future', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { locked_until: futureDate },
      ]);

      const result = await service.isUserLocked(testUserId, testTenantSchema);

      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toEqual(futureDate);
    });

    it('should return not locked when lock has expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { locked_until: pastDate },
      ]);

      const result = await service.isUserLocked(testUserId, testTenantSchema);

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeNull();
    });

    it('should return not locked when user not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.isUserLocked(testUserId, testTenantSchema);

      expect(result).toEqual({
        isLocked: false,
        lockedUntil: null,
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with all details', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      await service.logSecurityEvent(
        testTenantSchema,
        'login.success',
        testUserId,
        { action: 'login' },
        '192.168.1.1',
        'Mozilla/5.0',
        'req-123'
      );

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        'login.success',
        'Security event: login.success',
        expect.stringContaining(testUserId),
        'req-123'
      );
    });

    it('should handle missing optional parameters', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      await expect(
        service.logSecurityEvent(
          testTenantSchema,
          'logout',
          testUserId,
          { reason: 'user_initiated' }
        )
      ).resolves.not.toThrow();
    });

    it('should not throw error when logging fails', async () => {
      mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.logSecurityEvent(
          testTenantSchema,
          'error.event',
          testUserId,
          {}
        )
      ).resolves.not.toThrow();
    });

    it('should truncate long user agent strings', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
      const longUserAgent = 'A'.repeat(500);

      await service.logSecurityEvent(
        testTenantSchema,
        'test.event',
        testUserId,
        {},
        '127.0.0.1',
        longUserAgent
      );

      const callArgs = mockPrisma.$executeRawUnsafe.mock.calls[0];
      const payloadJson = JSON.parse(callArgs[3]);
      expect(payloadJson.userAgent.length).toBe(255);
    });
  });
});
