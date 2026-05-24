import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController, UserController } from '../auth.controller';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock('@tcrn/database', () => ({
  prisma: mockPrisma,
}));

function buildSuccessfulLoginResult() {
  return {
    type: 'success' as const,
    accessToken: 'access-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: 'refresh-token',
    refreshTokenExpiresAt: new Date('2026-05-11T12:00:00.000Z'),
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      preferredLanguage: 'en',
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: '2026-08-09T12:00:00.000Z',
      tenant: {
        id: 'tenant-1',
        name: 'Moonshot Tenant',
        tier: 'standard',
        schemaName: 'tenant_test',
      },
    },
  };
}

describe('AuthController refresh-token handling', () => {
  const mockAuthService = {
    login: vi.fn(),
    verifyTotp: vi.fn(),
    verifyRecoveryCode: vi.fn(),
    completeLoginAfterReset: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
  };
  const mockPasswordService = {
    validate: vi.fn(),
    hash: vi.fn(),
  };
  const mockTotpService = {};
  const mockTokenService = {
    generateRefreshToken: vi.fn(),
    verifyPasswordResetSessionToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
  };
  const mockSessionService = {
    logSecurityEvent: vi.fn(),
  };
  const mockEmailService = {
    sendSystemEmail: vi.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new AuthController(
      mockAuthService as never,
      mockPasswordService as never,
      mockTotpService as never,
      mockTokenService as never,
      mockSessionService as never,
      mockEmailService as never
    );
  });

  it('sets the login refresh-token cookie from the auth service result without minting another token', async () => {
    const result = buildSuccessfulLoginResult();
    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: vi.fn().mockReturnValue('Vitest'),
    };
    const res = {
      cookie: vi.fn(),
    };

    mockAuthService.login.mockResolvedValueOnce(result);

    const response = await controller.login(
      {
        tenantCode: 'TEST',
        login: 'alice',
        password: 'password',
      } as never,
      req as never,
      res as never
    );

    expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      result.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1',
        expires: result.refreshTokenExpiresAt,
      })
    );
    expect(response).toEqual({
      success: true,
      data: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: result.user,
      },
    });
  });

  it('reuses the service-issued refresh token for TOTP verification success', async () => {
    const result = buildSuccessfulLoginResult();
    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: vi.fn().mockReturnValue('Vitest'),
    };
    const res = {
      cookie: vi.fn(),
    };

    mockAuthService.verifyTotp.mockResolvedValueOnce(result);

    const response = await controller.verifyTotp(
      {
        sessionToken: 'totp-session-token',
        code: '123456',
      } as never,
      req as never,
      res as never
    );

    expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      result.refreshToken,
      expect.objectContaining({
        path: '/api/v1',
        expires: result.refreshTokenExpiresAt,
      })
    );
    expect(response).toEqual({
      success: true,
      data: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: result.user,
      },
    });
  });
});

describe('UserController auth/session queries', () => {
  const mockPasswordService = {
    verify: vi.fn(),
    getPasswordExpiryDate: vi.fn(),
  };
  const mockTotpService = {
    generateSetupInfo: vi.fn(),
    verify: vi.fn(),
    generateRecoveryCodes: vi.fn(),
    hashRecoveryCode: vi.fn(),
  };
  const mockSessionService = {
    logSecurityEvent: vi.fn(),
    getUserSessions: vi.fn(),
  };
  const mockTokenService = {
    verifyRefreshToken: vi.fn(),
  };
  const mockEmailService = {
    sendPasswordResetEmail: vi.fn(),
    sendEmailChangeVerification: vi.fn(),
  };

  const currentUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'alice@example.com',
    tenantSchema: 'tenant_test',
  };

  let controller: UserController;

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new UserController(
      mockPasswordService as never,
      mockTotpService as never,
      mockSessionService as never,
      mockTokenService as never,
      {
        uploadObject: vi.fn(),
        deleteObject: vi.fn(),
        buildObjectUrl: vi.fn(),
      } as never,
      mockEmailService as never
    );
  });

  it('uses uuid casts when preparing TOTP setup for the current user', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ is_totp_enabled: false }]);
    mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);
    mockTotpService.generateSetupInfo.mockResolvedValueOnce({
      secret: 'SECRET',
      qrCode: 'data:image/png;base64,abc',
      otpauthUrl: 'otpauth://totp/TCRN:alice@example.com?secret=SECRET',
      issuer: 'TCRN TMS',
      account: 'alice@example.com',
    });

    const result = await controller.setupTotp(currentUser as never);

    expect(result).toEqual({
      success: true,
      data: {
        secret: 'SECRET',
        qrCode: 'data:image/png;base64,abc',
        otpauthUrl: 'otpauth://totp/TCRN:alice@example.com?secret=SECRET',
        issuer: 'TCRN TMS',
        account: 'alice@example.com',
      },
    });
    expect(JSON.stringify(result)).not.toContain('qrCodeUrl');
    expect(JSON.stringify(result)).not.toContain('accountName');

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id,
      'SECRET'
    );
  });

  it('uses uuid casts when enabling TOTP for the current user', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        totp_secret: 'SECRET',
        is_totp_enabled: false,
      },
    ]);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockTotpService.verify.mockReturnValueOnce(true);
    mockTotpService.generateRecoveryCodes.mockReturnValueOnce(['ABCD-1234-WXYZ']);
    mockTotpService.hashRecoveryCode.mockReturnValueOnce('hashed-code');
    mockSessionService.logSecurityEvent.mockResolvedValueOnce(undefined);

    await controller.enableTotp(
      currentUser as never,
      { code: '123456' } as never,
      {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        get: vi.fn().mockReturnValue('Vitest'),
      } as never
    );

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('VALUES (gen_random_uuid(), $1::uuid, $2, false, now())'),
      currentUser.id,
      'hashed-code'
    );
  });

  it('passes the current refresh-token id into the sessions query when the cookie belongs to the authenticated user', async () => {
    const sessions = [{ id: 'session-1', isCurrent: true }];

    mockTokenService.verifyRefreshToken.mockResolvedValueOnce({
      userId: currentUser.id,
      tokenId: 'refresh-token-id',
      schema: currentUser.tenantSchema,
    });
    mockSessionService.getUserSessions.mockResolvedValueOnce(sessions);

    const result = await controller.getSessions(
      currentUser as never,
      {
        cookies: {
          refresh_token: 'rt_token',
        },
      } as never
    );

    expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
      'rt_token',
      currentUser.tenantSchema
    );
    expect(mockSessionService.getUserSessions).toHaveBeenCalledWith(
      currentUser.id,
      currentUser.tenantSchema,
      'refresh-token-id'
    );
    expect(result).toEqual({
      success: true,
      data: sessions,
    });
  });

  it('does not mark a current session when the cookie verifies to a different user', async () => {
    mockTokenService.verifyRefreshToken.mockResolvedValueOnce({
      userId: 'someone-else',
      tokenId: 'other-refresh-token-id',
      schema: currentUser.tenantSchema,
    });
    mockSessionService.getUserSessions.mockResolvedValueOnce([]);

    await controller.getSessions(
      currentUser as never,
      {
        cookies: {
          refresh_token: 'rt_token',
        },
      } as never
    );

    expect(mockSessionService.getUserSessions).toHaveBeenCalledWith(
      currentUser.id,
      currentUser.tenantSchema,
      undefined
    );
  });
});
