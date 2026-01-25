// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// Mock external dependencies
vi.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: vi.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
    keyuri: vi.fn().mockReturnValue('otpauth://totp/TCRN%20TMS:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TCRN%20TMS'),
    verify: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qrcode_data'),
}));

import { TotpService } from '../totp.service';
import { authenticator } from 'otplib';

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TotpService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate a TOTP secret', () => {
      const secret = service.generateSecret();

      expect(secret).toBe('JBSWY3DPEHPK3PXP');
      expect(authenticator.generateSecret).toHaveBeenCalledWith(20);
    });
  });

  describe('generateSetupInfo', () => {
    it('should generate setup info with QR code', async () => {
      const result = await service.generateSetupInfo('test@example.com');

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCode).toContain('data:image/png');
      expect(result.otpauthUrl).toContain('otpauth://totp');
      expect(result.issuer).toBe('TCRN TMS');
      expect(result.account).toBe('test@example.com');
    });

    it('should use provided secret if given', async () => {
      const result = await service.generateSetupInfo('test@example.com', 'CUSTOM_SECRET');

      expect(authenticator.keyuri).toHaveBeenCalledWith('test@example.com', 'TCRN TMS', 'CUSTOM_SECRET');
    });
  });

  describe('verify', () => {
    it('should verify valid TOTP code', () => {
      const result = service.verify('123456', 'secret');

      expect(result).toBe(true);
      expect(authenticator.verify).toHaveBeenCalledWith({ token: '123456', secret: 'secret' });
    });

    it('should return false for invalid code', () => {
      (authenticator.verify as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = service.verify('000000', 'secret');

      expect(result).toBe(false);
    });

    it('should return false when verification throws', () => {
      (authenticator.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid');
      });

      const result = service.verify('invalid', 'secret');

      expect(result).toBe(false);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate 10 recovery codes by default', () => {
      const codes = service.generateRecoveryCodes();

      expect(codes.length).toBe(10);
    });

    it('should generate specified number of codes', () => {
      const codes = service.generateRecoveryCodes(5);

      expect(codes.length).toBe(5);
    });

    it('should generate codes in XXXX-XXXX-XXXX format', () => {
      const codes = service.generateRecoveryCodes(1);

      expect(codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = service.generateRecoveryCodes(100);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });
  });

  describe('hashRecoveryCode', () => {
    it('should hash recovery code consistently', () => {
      const hash1 = service.hashRecoveryCode('ABCD-EFGH-IJKL');
      const hash2 = service.hashRecoveryCode('ABCD-EFGH-IJKL');

      expect(hash1).toBe(hash2);
    });

    it('should normalize codes before hashing', () => {
      const hash1 = service.hashRecoveryCode('abcd-efgh-ijkl');
      const hash2 = service.hashRecoveryCode('ABCDEFGHIJKL');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', () => {
      const hash1 = service.hashRecoveryCode('AAAA-AAAA-AAAA');
      const hash2 = service.hashRecoveryCode('BBBB-BBBB-BBBB');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyRecoveryCode', () => {
    it('should verify matching recovery code', () => {
      const code = 'ABCD-EFGH-IJKL';
      const hash = service.hashRecoveryCode(code);

      const result = service.verifyRecoveryCode(code, hash);

      expect(result).toBe(true);
    });

    it('should reject non-matching code', () => {
      const hash = service.hashRecoveryCode('AAAA-AAAA-AAAA');

      const result = service.verifyRecoveryCode('BBBB-BBBB-BBBB', hash);

      expect(result).toBe(false);
    });
  });

  describe('encryptSecret / decryptSecret', () => {
    it('should encrypt and decrypt secret correctly', () => {
      const secret = 'MY_SECRET_KEY';
      const encryptionKey = 'encryption_key';

      const encrypted = service.encryptSecret(secret, encryptionKey);
      const decrypted = service.decryptSecret(encrypted, encryptionKey);

      expect(decrypted).toBe(secret);
    });

    it('should throw for wrong decryption key', () => {
      const secret = 'MY_SECRET_KEY';
      const encrypted = service.encryptSecret(secret, 'correct_key');

      expect(() => service.decryptSecret(encrypted, 'wrong_key')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
