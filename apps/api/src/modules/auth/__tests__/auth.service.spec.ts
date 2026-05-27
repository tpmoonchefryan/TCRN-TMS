// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { TenantService } from '../../tenant/tenant.service';
import { AuthService } from '../auth.service';
import { PasswordService } from '../password.service';
import { SessionService } from '../session.service';
import { TokenService } from '../token.service';
import { TotpService } from '../totp.service';

// Mock @tcrn/database
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

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
      getPasswordExpiryDate: vi
        .fn()
        .mockReturnValue(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    };

    mockTotpService = {
      verify: vi.fn().mockReturnValue(true),
      verifyRecoveryCode: vi.fn().mockReturnValue(true),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue({ token: 'access_token', expiresIn: 900 }),
      generateRefreshToken: vi
        .fn()
        .mockResolvedValue({ token: 'refresh_token', expiresAt: new Date() }),
      generateTotpSessionToken: vi
        .fn()
        .mockReturnValue({ token: 'totp_session_token', expiresIn: 300 }),
      generatePasswordResetSessionToken: vi
        .fn()
        .mockReturnValue({ token: 'reset_session_token', expiresIn: 300 }),
      verifyTotpSessionToken: vi.fn(),
      verifyAccessToken: vi.fn(),
    };

    mockSessionService = {
      trackLoginAttempt: vi.fn().mockResolvedValue({ failedCount: 0, isLocked: false }),
      isUserLocked: vi.fn().mockResolvedValue({ isLocked: false }),
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockTenantService = {
      getTenantByCode: vi.fn().mockResolvedValue(mockTenant),
      getTenantById: vi.fn().mockResolvedValue(mockTenant),
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
      mockPermissionSnapshotService as PermissionSnapshotService
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
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.user).toBeDefined();
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        'tenant_test123',
        undefined,
        '127.0.0.1'
      );
    });

    it('fails closed before issuing an SSO session when permission snapshots cannot refresh', async () => {
      (
        mockPermissionSnapshotService.refreshUserSnapshots as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error('redis unavailable'));

      await expect(
        service.completeLogin(
          {
            ...mockUser,
            tenant_id: mockTenant.id,
            tenant_code: mockTenant.code,
            tenant_name: mockTenant.name,
            tenant_tier: mockTenant.tier,
          },
          mockTenant.schemaName,
          '127.0.0.1',
          'Vitest',
          { authMethod: 'sso', requirePermissionSnapshot: true }
        )
      ).rejects.toThrow(ForbiddenException);

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
    });

    it('keeps TCRN TOTP step-up before issuing an SSO session', async () => {
      const result = await service.completeLogin(
        {
          ...mockUser,
          is_totp_enabled: true,
          tenant_id: mockTenant.id,
          tenant_code: mockTenant.code,
          tenant_name: mockTenant.name,
          tenant_tier: mockTenant.tier,
        },
        mockTenant.schemaName,
        '127.0.0.1',
        'Vitest',
        { authMethod: 'sso', enforcePreSessionPosture: true, requirePermissionSnapshot: true }
      );

      expect(result).toEqual({
        type: 'totp_required',
        sessionToken: 'totp_session_token',
        expiresIn: 300,
      });
      expect(mockTokenService.generateTotpSessionToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        tid: mockTenant.id,
        tsc: mockTenant.schemaName,
      });
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
      expect(mockSessionService.trackLoginAttempt).not.toHaveBeenCalled();
    });

    it('fails closed before SSO token issuance when password reset posture is present', async () => {
      await expect(
        service.completeLogin(
          {
            ...mockUser,
            force_reset: true,
            tenant_id: mockTenant.id,
            tenant_code: mockTenant.code,
            tenant_name: mockTenant.name,
            tenant_tier: mockTenant.tier,
          },
          mockTenant.schemaName,
          '127.0.0.1',
          'Vitest',
          { authMethod: 'sso', enforcePreSessionPosture: true, requirePermissionSnapshot: true }
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
      expect(mockTokenService.generatePasswordResetSessionToken).not.toHaveBeenCalled();
      expect(mockSessionService.trackLoginAttempt).not.toHaveBeenCalled();
    });

    it('fails closed before SSO token issuance when the TCRN account is locked', async () => {
      (mockSessionService.isUserLocked as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        isLocked: true,
        lockedUntil: new Date('2026-05-27T01:00:00.000Z'),
      });

      await expect(
        service.completeLogin(
          {
            ...mockUser,
            tenant_id: mockTenant.id,
            tenant_code: mockTenant.code,
            tenant_name: mockTenant.name,
            tenant_tier: mockTenant.tier,
          },
          mockTenant.schemaName,
          '127.0.0.1',
          'Vitest',
          { authMethod: 'sso', enforcePreSessionPosture: true, requirePermissionSnapshot: true }
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
      expect(mockSessionService.trackLoginAttempt).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid tenant', async () => {
      (mockTenantService.getTenantByCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.login('INVALID', 'testuser', 'password', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for disabled tenant', async () => {
      (mockTenantService.getTenantByCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      await expect(service.login('TEST', 'testuser', 'password', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.login('TEST', 'nonexistent', 'password', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ ...mockUser, is_active: false }]);

      await expect(service.login('TEST', 'testuser', 'password', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      (mockPasswordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.login('TEST', 'testuser', 'wrong_password', '127.0.0.1')
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

      await expect(service.login('TEST', 'testuser', 'wrong', '127.0.0.1')).rejects.toThrow();

      expect(mockSessionService.trackLoginAttempt).toHaveBeenCalledWith(
        'user-123',
        'tenant_test123',
        false,
        '127.0.0.1'
      );
    });

    it('should reject login when user is locked', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      (mockSessionService.isUserLocked as ReturnType<typeof vi.fn>).mockResolvedValue({
        isLocked: true,
        lockedUntil: new Date(Date.now() + 300000),
      });

      await expect(service.login('TEST', 'testuser', 'password', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('verifyAccessToken', () => {
    const accessPayload = {
      sub: 'user-123',
      tid: 'tenant-123',
      tsc: 'tenant_test123',
      email: 'test@example.com',
      username: 'testuser',
      type: 'access' as const,
      jti: 'token-id',
    };

    it('returns the token payload only when tenant and user are still active', async () => {
      (mockTokenService.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        accessPayload
      );
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'user-123', is_active: true }]);

      await expect(service.verifyAccessToken('access-token')).resolves.toEqual(accessPayload);
      expect(mockTenantService.getTenantById).toHaveBeenCalledWith('tenant-123');
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1::uuid'),
        'user-123'
      );
    });

    it('fails closed when the token tenant no longer exists or schema drifts', async () => {
      (mockTokenService.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        ...accessPayload,
        tsc: 'tenant_old_schema',
      });

      await expect(service.verifyAccessToken('access-token')).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it('fails closed when the tenant is disabled after token issuance', async () => {
      (mockTokenService.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        accessPayload
      );
      (mockTenantService.getTenantById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockTenant,
        isActive: false,
      });

      await expect(service.verifyAccessToken('access-token')).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('fails closed when the user is disabled after token issuance', async () => {
      (mockTokenService.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        accessPayload
      );
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'user-123', is_active: false }]);

      await expect(service.verifyAccessToken('access-token')).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('fails closed when the token subject was deprovisioned', async () => {
      (mockTokenService.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        accessPayload
      );
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(service.verifyAccessToken('access-token')).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });

  describe('verifyTotp', () => {
    it('casts the session subject to uuid when loading the TOTP user record', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      (mockTokenService.verifyTotpSessionToken as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: userId,
        tid: mockTenant.id,
        tsc: mockTenant.schemaName,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          ...mockUser,
          id: userId,
          totp_secret: 'secret',
          is_totp_enabled: true,
        },
      ]);

      await expect(
        service.verifyTotp('session-token', '123456', '127.0.0.1')
      ).resolves.toMatchObject({
        type: 'success',
        accessToken: 'access_token',
      });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1::uuid'),
        userId
      );
    });
  });

  describe('verifyRecoveryCode', () => {
    it('casts recovery-code lookups and user reads to uuid when completing recovery login', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      (mockTokenService.verifyTotpSessionToken as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: userId,
        tid: mockTenant.id,
        tsc: mockTenant.schemaName,
      });
      (mockTotpService.verifyRecoveryCode as ReturnType<typeof vi.fn>).mockImplementation(
        (input: string, hash: string) => input === 'RECOVERY-123' && hash === 'hash-1'
      );
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: 'recovery-1',
            code_hash: 'hash-1',
            is_used: false,
          },
        ])
        .mockResolvedValueOnce([{ count: BigInt(7) }])
        .mockResolvedValueOnce([
          {
            ...mockUser,
            id: userId,
          },
        ]);

      await expect(
        service.verifyRecoveryCode('session-token', 'RECOVERY-123', '127.0.0.1')
      ).resolves.toMatchObject({
        type: 'success',
        recoveryCodesRemaining: 7,
      });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE user_id = $1::uuid AND is_used = false'),
        userId
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1::uuid'),
        'recovery-1'
      );
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('WHERE id = $1::uuid'),
        userId
      );
    });
  });
});
