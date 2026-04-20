import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserController } from '../auth.controller';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock('@tcrn/database', () => ({
  prisma: mockPrisma,
}));

describe('UserController TOTP queries', () => {
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
      {
        uploadObject: vi.fn(),
        deleteObject: vi.fn(),
        buildObjectUrl: vi.fn(),
      } as never,
      mockEmailService as never,
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

    await controller.setupTotp(currentUser as never);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id,
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id,
      'SECRET',
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
      } as never,
    );

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id,
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $1::uuid'),
      currentUser.id,
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('VALUES (gen_random_uuid(), $1::uuid, $2, false, now())'),
      currentUser.id,
      'hashed-code',
    );
  });
});
