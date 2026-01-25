// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// Mock @tcrn/database
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { AuthService, LoginResult } from '../auth.service';
import { PasswordService } from '../password.service';
import { TotpService } from '../totp.service';
import { TokenService } from '../token.service';
import { SessionService } from '../session.service';
import { TenantService } from '../../tenant/tenant.service';
import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { prisma } from '@tcrn/database';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('AuthService', () => {
  let service: AuthService;
  let mockPasswordService: Partial<PasswordService>;
  let mockTotpService: Partial<TotpService>;
  let mockTokenService: Partial<TokenService>;
  let mockSessionService: Partial<SessionService>;
  let mockTenantService: Partial<TenantService>;
  let mockPermissionSnapshotService: Partial<PermissionSnapshotService>;

  const mockTenant = {
    id: 'tenant-123',
    code: 'TEST',
    name: 'Test Tenant',
    schemaName: 'tenant_test123',
    tier: 'standard',
    isActive: true,
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    display_name: 'Test User',
    avatar_url: null,
    preferred_language: 'en',
    totp_secret: null,
    is_totp_enabled: false,
    is_active: true,
    force_reset: false,
    password_changed_at: new Date(),
    locked_until: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPasswordService = {
      verify: vi.fn().mockResolvedValue(true),
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      hash: vi.fn().mockResolvedValue('new_hash'),
      isPasswordExpired: vi.fn().mockReturnValue(false),
      getPasswordExpiryDate: vi.fn().mockReturnValue(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    };

    mockTotpService = {
      verify: vi.fn().mockReturnValue(true),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue({ token: 'access_token', expiresIn: 900 }),
      generateRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh_token', expiresAt: new Date() }),
      generateTotpSessionToken: vi.fn().mockReturnValue({ token: 'totp_session_token', expiresIn: 300 }),
      generatePasswordResetSessionToken: vi.fn().mockReturnValue({ token: 'reset_session_token', expiresIn: 300 }),
      verifyAccessToken: vi.fn(),
    };

    mockSessionService = {
      trackLoginAttempt: vi.fn().mockResolvedValue({ failedCount: 0, isLocked: false }),
      isUserLocked: vi.fn().mockResolvedValue({ isLocked: false }),
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockTenantService = {
      getTenantByCode: vi.fn().mockResolvedValue(mockTenant),
    };

    mockPermissionSnapshotService = {
      refreshUserSnapshots: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      mockPasswordService as PasswordService,
      mockTotpService as TotpService,
      mockTokenService as TokenService,
      mockSessionService as SessionService,
      mockTenantService as TenantService,
      mockPermissionSnapshotService as PermissionSnapshotService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);

      const result = await service.login('TEST', 'testuser', 'password', '127.0.0.1');

      expect(result.type).toBe('success');
      expect(result.accessToken).toBe('access_token');
      expect(result.user).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid tenant', async () => {
      (mockTenantService.getTenantByCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.login('INVALID', 'testuser', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for disabled tenant', async () => {
      (mockTenantService.getTenantByCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      await expect(
        service.login('TEST', 'testuser', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.login('TEST', 'nonexistent', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ ...mockUser, is_active: false }]);

      await expect(
        service.login('TEST', 'testuser', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      (mockPasswordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.login('TEST', 'testuser', 'wrong_password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return totp_required when TOTP is enabled', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { ...mockUser, is_totp_enabled: true, totp_secret: 'secret' },
      ]);

      const result = await service.login('TEST', 'testuser', 'password', '127.0.0.1');

      expect(result.type).toBe('totp_required');
      expect(result.sessionToken).toBeDefined();
    });

    it('should return password_reset_required when force_reset is true', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ ...mockUser, force_reset: true }]);

      const result = await service.login('TEST', 'testuser', 'password', '127.0.0.1');

      expect(result.type).toBe('password_reset_required');
    });

    it('should track failed login attempt', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      (mockPasswordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.login('TEST', 'testuser', 'wrong', '127.0.0.1'),
      ).rejects.toThrow();

      expect(mockSessionService.trackLoginAttempt).toHaveBeenCalledWith(
        'user-123',
        'tenant_test123',
        false,
        '127.0.0.1',
      );
    });

    it('should reject login when user is locked', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      (mockSessionService.isUserLocked as ReturnType<typeof vi.fn>).mockResolvedValue({
        isLocked: true,
        lockedUntil: new Date(Date.now() + 300000),
      });

      await expect(
        service.login('TEST', 'testuser', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
