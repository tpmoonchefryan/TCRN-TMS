// SPDX-License-Identifier: Apache-2.0
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { TokenService } from '../token.service';

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

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJwtService = {
      sign: vi.fn().mockReturnValue('signed_jwt_token'),
      verify: vi.fn().mockReturnValue({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
        type: 'access',
        jti: 'token-id',
      }),
    };

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '12h',
        };
        return config[key] || defaultValue;
      }),
    };

    service = new TokenService(mockJwtService as JwtService, mockConfigService as ConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct payload', () => {
      const result = service.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.token).toBe('signed_jwt_token');
      expect(result.expiresIn).toBe(900); // 15 minutes
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          type: 'access',
        }),
        expect.objectContaining({
          expiresIn: 900,
        })
      );
    });

    it('should include jti in token payload', () => {
      service.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      const signCall = (mockJwtService.sign as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(signCall[0].jti).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const result = service.verifyAccessToken('valid_token');

      expect(result.sub).toBe('user-123');
      expect(result.type).toBe('access');
    });

    it('should throw UnauthorizedException for invalid token type', () => {
      (mockJwtService.verify as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-123',
        type: 'refresh', // Wrong type
      });

      expect(() => service.verifyAccessToken('invalid_type_token')).toThrow(UnauthorizedException);
    });

    it('should throw when JWT verification fails', () => {
      (mockJwtService.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.verifyAccessToken('expired_token')).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token and store in database', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.generateRefreshToken(
        'user-123',
        'tenant_test',
        'Chrome/120',
        '127.0.0.1'
      );

      expect(result.token).toMatch(/^rt_/);
      expect(result.token).not.toContain('.');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should hash refresh token before storage', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const _result = await service.generateRefreshToken('user-123', 'tenant_test');

      // The token should be different from what's stored (hashed)
      const insertCall = mockPrisma.$executeRawUnsafe.mock.calls[0];
      expect(insertCall[0]).toContain('token_hash');
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies opaque refresh tokens only inside the trusted tenant schema', async () => {
      const expiresAt = new Date(Date.now() + 60_000);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'token-123',
          user_id: 'user-123',
          expires_at: expiresAt,
          revoked_at: null,
        },
      ]);

      const result = await service.verifyRefreshToken('rt_opaque_refresh_token', 'tenant_test');

      expect(result).toEqual({
        userId: 'user-123',
        tokenId: 'token-123',
        schema: 'tenant_test',
      });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FROM "tenant_test".refresh_token'),
        expect.any(String)
      );
    });

    it.each([
      ['legacy same-tenant prefix', 'rt_dGVuYW50X3Rlc3Q=.aaaaaaaa'],
      ['cross-tenant prefix', 'rt_dGVuYW50X290aGVy.aaaaaaaa'],
      ['quote-control prefix', `rt_${Buffer.from('tenant_bad"schema').toString('base64')}.aaaaaaaa`],
      ['malformed prefix', 'rt_%%%not-base64%%%.aaaaaaaa'],
    ])('rejects %s before any schema SQL', async (_label, token) => {
      const result = await service.verifyRefreshToken(token, 'tenant_test');

      expect(result).toBeNull();
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('TTL parsing', () => {
    it('should parse minutes correctly', () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TTL') return '30m';
        return '12h';
      });

      const newService = new TokenService(
        mockJwtService as JwtService,
        mockConfigService as ConfigService
      );

      const result = newService.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.expiresIn).toBe(1800); // 30 minutes
    });

    it('should parse hours correctly', () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TTL') return '2h';
        return '12h';
      });

      const newService = new TokenService(
        mockJwtService as JwtService,
        mockConfigService as ConfigService
      );

      const result = newService.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.expiresIn).toBe(7200); // 2 hours
    });

    it('should handle numeric strings as seconds', () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TTL') return '600';
        return '12h';
      });

      const newService = new TokenService(
        mockJwtService as JwtService,
        mockConfigService as ConfigService
      );

      const result = newService.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.expiresIn).toBe(600);
    });

    it('should use default TTL for invalid format', () => {
      (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TTL') return 'invalid';
        return '12h';
      });

      const newService = new TokenService(
        mockJwtService as JwtService,
        mockConfigService as ConfigService
      );

      const result = newService.generateAccessToken({
        sub: 'user-123',
        tid: 'tenant-123',
        tsc: 'tenant_test',
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.expiresIn).toBe(900); // Default 15 minutes
    });
  });
});
