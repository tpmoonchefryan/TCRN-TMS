// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach } from 'vitest';

import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hash', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const isValid = await service.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const isValid = await service.verify('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const isValid = await service.verify('password', 'invalid-hash');

      expect(isValid).toBe(false);
    });
  });

  describe('validate', () => {
    it('should accept valid password', () => {
      const result = service.validate('ValidPass123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without uppercase', () => {
      const result = service.validate('validpass123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = service.validate('VALIDPASS123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = service.validate('ValidPassWord!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = service.validate('ValidPass123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject short password', () => {
      const result = service.validate('Vp1!');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    });

    it('should return multiple errors for very weak password', () => {
      const result = service.validate('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isSamePassword', () => {
    it('should detect same password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const isSame = await service.isSamePassword(password, hash);

      expect(isSame).toBe(true);
    });

    it('should detect different password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const isSame = await service.isSamePassword('DifferentPass123!', hash);

      expect(isSame).toBe(false);
    });
  });

  describe('getPasswordExpiryDate', () => {
    it('should return a future date', () => {
      const expiryDate = service.getPasswordExpiryDate();

      expect(expiryDate).toBeInstanceOf(Date);
      expect(expiryDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('isPasswordExpired', () => {
    it('should return true for null passwordChangedAt', () => {
      const isExpired = service.isPasswordExpired(null);

      expect(isExpired).toBe(true);
    });

    it('should return false for recently changed password', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

      const isExpired = service.isPasswordExpired(recentDate);

      expect(isExpired).toBe(false);
    });

    it('should return true for old password', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const isExpired = service.isPasswordExpired(oldDate);

      expect(isExpired).toBe(true);
    });
  });
});
